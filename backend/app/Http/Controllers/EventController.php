<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class EventController extends Controller
{
    // GET /api/events
    public function index(Request $request)
    {
        $user = $request->user();

        $events = Event::with(['organizer:id,name', 'category:id,name,color'])
            ->withCount([
                'tickets' => fn ($q) => $q->where('status', '!=', 'cancelled'),
                'waitlist',
            ])
            ->withExists(['waitlist as on_waitlist' => fn ($q) => $q->where('user_id', $user->id)])
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

        $validated = $request->validate($this->eventRules(creating: true), $this->eventMessages());

        $event = $request->user()->events()->create($validated);

        return response()->json([
            'message' => 'Event created successfully.',
            'event' => $event,
        ], 201);
    }

    // GET /api/events/{event}
    public function show(Request $request, Event $event)
    {
        Gate::authorize('view', $event);

        $event->load(['organizer:id,name', 'category:id,name,color'])
            ->loadCount([
                'tickets' => fn ($q) => $q->where('status', '!=', 'cancelled'),
                'waitlist',
            ]);

        // The student's place in line (1 = next to get a ticket), or null if not waiting
        $entry = $event->waitlist()->where('user_id', $request->user()->id)->first();
        $event->setAttribute('on_waitlist', (bool) $entry);
        $event->setAttribute('waitlist_position', $entry
            ? $event->waitlist()
                ->where(fn ($q) => $q->where('created_at', '<', $entry->created_at)
                    ->orWhere(fn ($q) => $q->where('created_at', $entry->created_at)->where('id', '<=', $entry->id)))
                ->count()
            : null);

        return response()->json($event);
    }

    // PUT /api/events/{event}
    public function update(Request $request, Event $event)
    {
        Gate::authorize('update', $event);

        $ticketsSold = $event->tickets()->where('status', '!=', 'cancelled')->count();

        $validated = $request->validate(
            $this->eventRules(creating: false, minCapacity: max(1, $ticketsSold)),
            $this->eventMessages(),
        );

        // Publishing again only makes sense for events that haven't started
        $publishing = ($validated['status'] ?? $event->status) === 'published' && $event->status !== 'published';
        if ($publishing && Carbon::parse($validated['start_at'])->isPast()) {
            throw ValidationException::withMessages([
                'status' => ['An event that has already started cannot be published.'],
            ]);
        }

        $event->update($validated);

        // Extra capacity goes to students on the waitlist
        foreach ($event->promoteWaitlist() as $promoted) {
            $this->sendTicketEmail($promoted, fromWaitlist: true);
        }

        return response()->json([
            'message' => 'Event updated successfully.',
            'event' => $event,
        ]);
    }

    // DELETE /api/events/{event}
    public function destroy(Event $event)
    {
        Gate::authorize('delete', $event);

        // Students holding tickets would lose them silently; cancel the event first
        $activeTickets = $event->tickets()->where('status', '!=', 'cancelled')->count();
        if ($activeTickets > 0 && $event->status !== 'cancelled') {
            throw ValidationException::withMessages([
                'event' => ["This event has {$activeTickets} active ticket(s). Cancel the event first, then delete it."],
            ]);
        }

        if ($event->poster_path) {
            Storage::disk('public')->delete($event->poster_path);
        }

        $event->delete();

        return response()->json([
            'message' => 'Event deleted successfully.',
        ]);
    }

    /**
     * Validation rules shared by create and update.
     *
     * @return array<string, array<int, string>>
     */
    private function eventRules(bool $creating, int $minCapacity = 1): array
    {
        return [
            'title' => ['required', 'string', 'min:3', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'venue' => ['required', 'string', 'min:2', 'max:150'],
            // New events must be in the future; edits may keep a past start time
            'start_at' => $creating ? ['required', 'date', 'after:now'] : ['required', 'date'],
            'end_at' => ['required', 'date', 'after:start_at'],
            // Capacity can't go below the number of tickets already issued
            'capacity' => ['required', 'integer', 'min:'.$minCapacity, 'max:100000'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'status' => ['nullable', 'in:draft,published,cancelled'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function eventMessages(): array
    {
        return [
            'start_at.after' => 'The event must start in the future.',
            'end_at.after' => 'The end time must be after the start time.',
            'capacity.min' => 'Capacity must be at least :min (tickets already issued).',
            'category_id.exists' => 'Pick a category from the list.',
        ];
    }
}
