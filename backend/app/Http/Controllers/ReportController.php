<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Ticket;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    // GET /api/reports  (admins: every event, organizers: their own events)
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isStudent()) {
            abort(403, 'Only organizers and admins can view reports.');
        }

        $events = Event::with('organizer:id,name')
            ->withCount([
                'tickets as tickets_sold' => fn ($q) => $q->where('status', '!=', 'cancelled'),
                'tickets as checked_in' => fn ($q) => $q->where('status', 'used'),
                'tickets as cancelled' => fn ($q) => $q->where('status', 'cancelled'),
            ])
            ->when(! $user->isAdmin(), fn ($query) => $query->where('user_id', $user->id))
            ->orderBy('start_at')
            ->get(['id', 'user_id', 'title', 'venue', 'start_at', 'capacity', 'price', 'status']);

        $rows = $events->map(fn (Event $event) => [
            'id' => $event->id,
            'title' => $event->title,
            'venue' => $event->venue,
            'start_at' => $event->start_at,
            'status' => $event->status,
            'organizer' => $event->organizer?->name,
            'capacity' => $event->capacity,
            'tickets_sold' => $event->tickets_sold,
            'checked_in' => $event->checked_in,
            'cancelled' => $event->cancelled,
            // Share of sold tickets that were actually used at the entrance
            'attendance_rate' => $event->tickets_sold > 0
                ? round($event->checked_in / $event->tickets_sold * 100, 1)
                : 0,
            'revenue' => round($event->tickets_sold * (float) $event->price, 2),
        ]);

        // Active tickets reserved per day over the last 14 days (Philippine dates), for the trend chart
        $since = now('Asia/Manila')->subDays(13)->startOfDay();
        $reservedAt = Ticket::whereIn('event_id', $events->pluck('id'))
            ->where('status', '!=', 'cancelled')
            ->where('created_at', '>=', $since->copy()->utc())
            ->pluck('created_at')
            ->countBy(fn ($at) => $at->timezone('Asia/Manila')->toDateString());
        $daily = collect(range(0, 13))->map(function (int $offset) use ($since, $reservedAt) {
            $date = $since->copy()->addDays($offset)->toDateString();

            return ['date' => $date, 'tickets' => $reservedAt->get($date, 0)];
        });

        return response()->json([
            'daily' => $daily,
            'totals' => [
                'events' => $rows->count(),
                'published_events' => $rows->where('status', 'published')->count(),
                'tickets_sold' => $rows->sum('tickets_sold'),
                'checked_in' => $rows->sum('checked_in'),
                'cancelled' => $rows->sum('cancelled'),
                'revenue' => round($rows->sum('revenue'), 2),
            ],
            'events' => $rows->values(),
        ]);
    }
}
