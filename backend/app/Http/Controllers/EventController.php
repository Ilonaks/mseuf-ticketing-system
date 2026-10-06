<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class EventController extends Controller
{
    // GET /api/events
    public function index(Request $request)
    {
        $user = $request->user();

        $events = Event::with('organizer:id,name')
            ->withCount(['tickets' => fn ($q) => $q->where('status', '!=', 'cancelled')])
            ->when(! $user->isAdmin(), function ($query) use ($user) {
                // Non-admins see published events plus their own drafts
                $query->where(function ($q) use ($user) {
                    $q->where('status', 'published')
                      ->orWhere('user_id', $user->id);
                });
            })
            ->orderBy('start_at')
            ->get();

        return response()->json($events);
    }

    // POST /api/events
    public function store(Request $request)
    {
        Gate::authorize('create', Event::class);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'venue' => ['required', 'string', 'max:255'],
            'start_at' => ['required', 'date', 'after:now'],
            'end_at' => ['required', 'date', 'after:start_at'],
            'capacity' => ['required', 'integer', 'min:1'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:draft,published,cancelled'],
        ]);

        $event = $request->user()->events()->create($validated);

        return response()->json([
            'message' => 'Event created successfully.',
            'event' => $event,
        ], 201);
    }

    // GET /api/events/{event}
    public function show(Event $event)
    {
        Gate::authorize('view', $event);

        $event->load('organizer:id,name')
              ->loadCount(['tickets' => fn ($q) => $q->where('status', '!=', 'cancelled')]);

        return response()->json($event);
    }

    // PUT /api/events/{event}
    public function update(Request $request, Event $event)
    {
        Gate::authorize('update', $event);

        $ticketsSold = $event->tickets()->where('status', '!=', 'cancelled')->count();

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'venue' => ['required', 'string', 'max:255'],
            'start_at' => ['required', 'date'],
            'end_at' => ['required', 'date', 'after:start_at'],
            // Capacity can't go below the number of tickets already issued
            'capacity' => ['required', 'integer', 'min:' . max(1, $ticketsSold)],
            'price' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:draft,published,cancelled'],
        ]);

        $event->update($validated);

        return response()->json([
            'message' => 'Event updated successfully.',
            'event' => $event,
        ]);
    }

    // DELETE /api/events/{event}
    public function destroy(Event $event)
    {
        Gate::authorize('delete', $event);

        $event->delete();

        return response()->json([
            'message' => 'Event deleted successfully.',
        ]);
    }
}