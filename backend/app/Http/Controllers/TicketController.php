<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TicketController extends Controller
{
    // GET /api/tickets  (the logged-in user's tickets)
    public function index(Request $request)
    {
        $tickets = $request->user()->tickets()
            ->with('event:id,title,venue,start_at,end_at,price,status')
            ->latest()
            ->get();

        return response()->json($tickets);
    }

    // POST /api/events/{event}/tickets  (reserve a ticket)
    public function store(Request $request, Event $event)
    {
        $user = $request->user();

        if (! $user->isStudent()) {
            abort(403, 'Only students can reserve tickets.');
        }

        if ($event->status !== 'published') {
            throw ValidationException::withMessages([
                'event' => ['This event is not open for tickets.'],
            ]);
        }

        if ($event->start_at->isPast()) {
            throw ValidationException::withMessages([
                'event' => ['This event has already started.'],
            ]);
        }

        $ticket = DB::transaction(function () use ($user, $event) {
            $existing = Ticket::where('user_id', $user->id)
                ->where('event_id', $event->id)
                ->first();

            if ($existing && $existing->status !== 'cancelled') {
                throw ValidationException::withMessages([
                    'event' => ['You already have a ticket for this event.'],
                ]);
            }

            $issued = $event->tickets()->where('status', '!=', 'cancelled')->count();

            if ($issued >= $event->capacity) {
                throw ValidationException::withMessages([
                    'event' => ['This event is sold out.'],
                ]);
            }

            // Re-activate a previously cancelled ticket
            if ($existing) {
                $existing->update([
                    'status' => 'reserved',
                    'ticket_code' => $this->generateCode(),
                    'checked_in_at' => null,
                ]);

                return $existing;
            }

            return $event->tickets()->create([
                'user_id' => $user->id,
                'ticket_code' => $this->generateCode(),
                'status' => 'reserved',
            ]);
        });

        return response()->json([
            'message' => 'Ticket reserved successfully.',
            'ticket' => $ticket->load('event:id,title,venue,start_at'),
        ], 201);
    }

    // GET /api/tickets/{ticket}
    public function show(Request $request, Ticket $ticket)
    {
        $user = $request->user();

        if ($ticket->user_id !== $user->id && ! $user->isAdmin()) {
            abort(403);
        }

        return response()->json($ticket->load('event'));
    }

    // PATCH /api/tickets/{ticket}/cancel
    public function cancel(Request $request, Ticket $ticket)
    {
        if ($ticket->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($ticket->status !== 'reserved') {
            throw ValidationException::withMessages([
                'ticket' => ['Only reserved tickets can be cancelled.'],
            ]);
        }

        $ticket->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Ticket cancelled successfully.',
            'ticket' => $ticket,
        ]);
    }

    // Generates a unique code like MSEUF-A8K2PX9Q
    private function generateCode(): string
    {
        do {
            $code = 'MSEUF-' . strtoupper(Str::random(8));
        } while (Ticket::where('ticket_code', $code)->exists());

        return $code;
    }
}