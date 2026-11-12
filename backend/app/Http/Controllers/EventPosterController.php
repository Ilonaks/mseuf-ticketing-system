<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EventPosterController extends Controller
{
    // GET /api/events/{event}/poster  (public, so <img> tags can load it without a token)
    public function show(Event $event): StreamedResponse
    {
        // Draft posters stay private until the event is published
        abort_if(! $event->poster_path || $event->status === 'draft', 404);
        abort_unless(Storage::disk('public')->exists($event->poster_path), 404);

        return Storage::disk('public')->response($event->poster_path, null, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    // POST /api/events/{event}/poster  (multipart upload, replaces any existing poster)
    public function store(Request $request, Event $event)
    {
        Gate::authorize('update', $event);

        $request->validate([
            'poster' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:3072', // kilobytes = 3 MB
                'dimensions:min_width=300,min_height=200,max_width=6000,max_height=6000',
            ],
        ], [
            'poster.max' => 'The poster must be 3 MB or smaller.',
            'poster.dimensions' => 'The poster must be at least 300×200 pixels.',
            'poster.mimes' => 'The poster must be a JPG, PNG, or WebP image.',
        ]);

        $old = $event->poster_path;
        $event->update(['poster_path' => $request->file('poster')->store('posters', 'public')]);

        if ($old) {
            Storage::disk('public')->delete($old);
        }

        return response()->json([
            'message' => 'Poster uploaded.',
            'poster_url' => $event->poster_url,
        ]);
    }

    // DELETE /api/events/{event}/poster
    public function destroy(Event $event)
    {
        Gate::authorize('update', $event);

        if ($event->poster_path) {
            Storage::disk('public')->delete($event->poster_path);
            $event->update(['poster_path' => null]);
        }

        return response()->json(['message' => 'Poster removed.']);
    }
}
