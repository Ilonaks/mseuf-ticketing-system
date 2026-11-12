<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class WaitlistController extends Controller
{
    // POST /api/events/{event}/waitlist  (student joins the waitlist of a sold-out event)
    public function store(Request $request, Event $event)
    {
        $user = $request->user();

        if (! $user->isStudent()) {
            abort(403, 'Only students can join a waitlist.');
        }

        if ($event->status !== 'published' || $event->start_at->isPast()) {
            throw ValidationException::withMessages([
                'event' => ['This event is not open for tickets.'],
            ]);
        }

        if ($event->tickets()->where('user_id', $user->id)->where('status', '!=', 'cancelled')->exists()) {
            throw ValidationException::withMessages([
                'event' => ['You already have a ticket for this event.'],
            ]);
        }

        if ($event->activeTicketCount() < $event->capacity) {
            throw ValidationException::withMessages([
                'event' => ['Slots are still available. Reserve a ticket instead.'],
            ]);
        }

        if ($user->waitlistEntries()->where('event_id', $event->id)->exists()) {
            throw ValidationException::withMessages([
                'event' => ['You are already on the waitlist for this event.'],
            ]);
        }

        $user->waitlistEntries()->create(['event_id' => $event->id]);

        return response()->json([
            'message' => 'You joined the waitlist. We\'ll give you a ticket automatically if a slot opens.',
            'position' => $event->waitlist()->count(),
        ], 201);
    }

    // DELETE /api/events/{event}/waitlist  (student leaves the waitlist)
    public function destroy(Request $request, Event $event)
    {
        $deleted = $request->user()->waitlistEntries()->where('event_id', $event->id)->delete();

        if ($deleted === 0) {
            throw ValidationException::withMessages([
                'event' => ['You are not on the waitlist for this event.'],
            ]);
        }

        return response()->json([
            'message' => 'You left the waitlist.',
        ]);
    }
}
