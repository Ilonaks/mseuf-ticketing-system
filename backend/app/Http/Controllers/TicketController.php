<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

            if ($event->activeTicketCount() >= $event->capacity) {
                throw ValidationException::withMessages([
                    'event' => ['This event is sold out. You can join the waitlist instead.'],
                ]);
            }

            // Got a ticket directly, so they no longer need their waitlist spot
            $user->waitlistEntries()->where('event_id', $event->id)->delete();

            return $event->issueTicketTo($user);
        });

        $this->sendTicketEmail($ticket);

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

    // GET /api/events/{event}/attendees  (organizer of the event, or admin)
    public function attendees(Event $event)
    {
        Gate::authorize('viewAttendees', $event);

        $tickets = $event->tickets()
            ->with('user:id,name,email,student_id')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'event' => $event->only(['id', 'title', 'venue', 'start_at', 'capacity', 'status']),
            'summary' => [
                'reserved' => $tickets->where('status', 'reserved')->count(),
                'checked_in' => $tickets->where('status', 'used')->count(),
                'cancelled' => $tickets->where('status', 'cancelled')->count(),
            ],
            'tickets' => $tickets,
        ]);
    }

    // POST /api/check-in  (scan a ticket's QR code at the entrance)
    public function checkIn(Request $request)
    {
        $validated = $request->validate([
            'ticket_code' => ['required', 'string'],
            'event_id' => ['nullable', 'integer'],
        ]);

        $ticket = Ticket::with(['event', 'user:id,name,email,student_id'])
            ->where('ticket_code', strtoupper(trim($validated['ticket_code'])))
            ->first();

        if (! $ticket) {
            throw ValidationException::withMessages([
                'ticket_code' => ['Ticket not found. Check the code and try again.'],
            ]);
        }

        // When scanning at a specific event, reject tickets for other events
        if (isset($validated['event_id']) && $ticket->event_id !== $validated['event_id']) {
            throw ValidationException::withMessages([
                'ticket_code' => ['This ticket is for a different event.'],
            ]);
        }

        Gate::authorize('checkIn', $ticket->event);

        if ($ticket->status === 'cancelled') {
            throw ValidationException::withMessages([
                'ticket_code' => ['This ticket was cancelled.'],
            ]);
        }

        if ($ticket->status === 'used') {
            throw ValidationException::withMessages([
                'ticket_code' => ['This ticket was already used at '.$ticket->checked_in_at->format('M j, Y g:i A').'.'],
            ]);
        }

        if ($ticket->event->status !== 'published') {
            throw ValidationException::withMessages([
                'ticket_code' => ['This event is not open for check-in.'],
            ]);
        }

        // Only on the event itself: from shortly before the start until it ends
        if ($reason = $ticket->event->checkInClosedReason()) {
            throw ValidationException::withMessages([
                'ticket_code' => [$reason],
            ]);
        }

        // Only mark it used if it is still reserved, so two scanners
        // scanning the same ticket at once can't both succeed
        $updated = Ticket::whereKey($ticket->id)
            ->where('status', 'reserved')
            ->update(['status' => 'used', 'checked_in_at' => now()]);

        if ($updated === 0) {
            throw ValidationException::withMessages([
                'ticket_code' => ['This ticket was already used.'],
            ]);
        }

        return response()->json([
            'message' => 'Checked in successfully.',
            'ticket' => $ticket->refresh()->load(['event:id,title,venue,start_at', 'user:id,name,email,student_id']),
        ]);
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

        if ($ticket->event->start_at->isPast()) {
            throw ValidationException::withMessages([
                'ticket' => ['This event has already started, so the ticket can no longer be cancelled.'],
            ]);
        }

        $ticket->update(['status' => 'cancelled']);

        // The freed slot goes to the next student on the waitlist
        foreach ($ticket->event->promoteWaitlist() as $promoted) {
            $this->sendTicketEmail($promoted, fromWaitlist: true);
        }

        return response()->json([
            'message' => 'Ticket cancelled successfully.',
            'ticket' => $ticket,
        ]);
    }

    // GET /api/events/{event}/attendees/export  (CSV download for the organizer or admin)
    public function exportAttendees(Event $event): StreamedResponse
    {
        Gate::authorize('viewAttendees', $event);

        $tickets = $event->tickets()->with('user:id,name,email,student_id')->orderBy('created_at')->get();
        $filename = Str::slug($event->title).'-attendees.csv';

        return response()->streamDownload(function () use ($tickets) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel shows ñ and other accents correctly
            fputcsv($out, ['Name', 'Student ID', 'Email', 'Ticket code', 'Status', 'Reserved at', 'Checked in at']);

            foreach ($tickets as $ticket) {
                fputcsv($out, array_map([$this, 'csvSafe'], [
                    $ticket->user?->name,
                    $ticket->user?->student_id,
                    $ticket->user?->email,
                    $ticket->ticket_code,
                    $ticket->status === 'used' ? 'checked in' : $ticket->status,
                    $ticket->created_at?->timezone('Asia/Manila')->format('Y-m-d H:i'),
                    $ticket->checked_in_at?->timezone('Asia/Manila')->format('Y-m-d H:i'),
                ]));
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Stops spreadsheet apps from running a cell as a formula (e.g. a name starting with "=").
     */
    private function csvSafe(?string $value): string
    {
        $value ??= '';

        return preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;
    }
}
