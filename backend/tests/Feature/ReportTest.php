<?php

use App\Models\Event;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('reports count tickets sold, attendance, and revenue per event', function () {
    $event = Event::factory()->create(['price' => 150]);
    Ticket::factory()->for($event)->count(3)->create();
    Ticket::factory()->for($event)->used()->count(1)->create();
    Ticket::factory()->for($event)->cancelled()->create();

    $this->actingAs($event->organizer)
        ->getJson('/api/reports')
        ->assertOk()
        ->assertJsonPath('events.0.tickets_sold', 4)
        ->assertJsonPath('events.0.checked_in', 1)
        ->assertJsonPath('events.0.cancelled', 1)
        ->assertJsonPath('events.0.attendance_rate', 25)
        ->assertJsonPath('events.0.revenue', 600)
        ->assertJsonPath('totals.tickets_sold', 4);
});

test('reports include tickets reserved per day for the last 14 days', function () {
    $event = Event::factory()->create();
    Ticket::factory()->for($event)->count(2)->create();
    Ticket::factory()->for($event)->create(['created_at' => now()->subDays(30)]); // too old to count

    $daily = $this->actingAs($event->organizer)
        ->getJson('/api/reports')
        ->assertOk()
        ->assertJsonCount(14, 'daily')
        ->json('daily');

    expect(end($daily))->toBe(['date' => now('Asia/Manila')->toDateString(), 'tickets' => 2])
        ->and(array_sum(array_column($daily, 'tickets')))->toBe(2);
});

test('organizers only see their own events in reports', function () {
    $organizer = User::factory()->organizer()->create();
    Event::factory()->for($organizer, 'organizer')->create();
    Event::factory()->create();

    $this->actingAs($organizer)
        ->getJson('/api/reports')
        ->assertOk()
        ->assertJsonCount(1, 'events')
        ->assertJsonPath('totals.events', 1);
});

test('admins see every event in reports', function () {
    Event::factory()->count(2)->create();
    Event::factory()->draft()->create();

    $this->actingAs(User::factory()->admin()->create())
        ->getJson('/api/reports')
        ->assertOk()
        ->assertJsonCount(3, 'events')
        ->assertJsonPath('totals.published_events', 2);
});

test('students cannot view reports', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/reports')
        ->assertForbidden();
});
