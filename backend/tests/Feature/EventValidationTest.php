<?php

use App\Models\Event;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function eventData(array $overrides = []): array
{
    return array_merge([
        'title' => 'Science Fair',
        'description' => 'Projects from every college.',
        'venue' => 'MSEUF Gymnasium',
        'start_at' => now()->addDays(5)->toIso8601String(),
        'end_at' => now()->addDays(5)->addHours(3)->toIso8601String(),
        'capacity' => 200,
        'price' => 0,
        'status' => 'draft',
    ], $overrides);
}

test('an organizer can create a valid event', function () {
    $this->actingAs(User::factory()->organizer()->create())
        ->postJson('/api/events', eventData())
        ->assertCreated();
});

test('invalid event fields are rejected', function (array $overrides, string $field) {
    $this->actingAs(User::factory()->organizer()->create())
        ->postJson('/api/events', eventData($overrides))
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'title too short' => [['title' => 'AB'], 'title'],
    'missing venue' => [['venue' => ''], 'venue'],
    'start in the past' => [['start_at' => now()->subDay()->toIso8601String()], 'start_at'],
    'end before start' => [['end_at' => now()->addDays(4)->toIso8601String()], 'end_at'],
    'zero capacity' => [['capacity' => 0], 'capacity'],
    'huge capacity' => [['capacity' => 1000000], 'capacity'],
    'negative price' => [['price' => -1], 'price'],
    'unknown status' => [['status' => 'archived'], 'status'],
    'long description' => [['description' => str_repeat('a', 2001)], 'description'],
]);

test('capacity cannot drop below tickets already issued', function () {
    $event = Event::factory()->create(['capacity' => 10]);
    Ticket::factory()->for($event)->count(3)->create();

    $this->actingAs($event->organizer)
        ->putJson("/api/events/{$event->id}", eventData(['capacity' => 2, 'status' => 'published']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('capacity');
});

test('an event that already started cannot be published', function () {
    $event = Event::factory()->draft()->create([
        'start_at' => now()->subHour(),
        'end_at' => now()->addHour(),
    ]);

    $this->actingAs($event->organizer)
        ->putJson("/api/events/{$event->id}", eventData([
            'start_at' => $event->start_at->toIso8601String(),
            'end_at' => $event->end_at->toIso8601String(),
            'status' => 'published',
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');
});

test('an event with active tickets cannot be deleted until it is cancelled', function () {
    $event = Event::factory()->create();
    Ticket::factory()->for($event)->create();

    $this->actingAs($event->organizer)
        ->deleteJson("/api/events/{$event->id}")
        ->assertUnprocessable();

    $event->update(['status' => 'cancelled']);

    $this->actingAs($event->organizer)
        ->deleteJson("/api/events/{$event->id}")
        ->assertOk();

    expect(Event::find($event->id))->toBeNull();
});

test('an event without active tickets can be deleted', function () {
    $event = Event::factory()->create();
    Ticket::factory()->for($event)->cancelled()->create();

    $this->actingAs($event->organizer)
        ->deleteJson("/api/events/{$event->id}")
        ->assertOk();
});
