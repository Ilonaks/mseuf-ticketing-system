<?php

use App\Models\Event;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('the organizer sees attendees of their event with a status summary', function () {
    $event = Event::factory()->create();
    Ticket::factory()->for($event)->count(2)->create();
    Ticket::factory()->for($event)->used()->create();
    Ticket::factory()->for($event)->cancelled()->create();

    $this->actingAs($event->organizer)
        ->getJson("/api/events/{$event->id}/attendees")
        ->assertOk()
        ->assertJsonCount(4, 'tickets')
        ->assertJsonPath('summary', ['reserved' => 2, 'checked_in' => 1, 'cancelled' => 1])
        ->assertJsonStructure(['tickets' => [['ticket_code', 'status', 'user' => ['name', 'email', 'student_id']]]]);
});

test('an admin can view attendees of any event', function () {
    $event = Event::factory()->create();

    $this->actingAs(User::factory()->admin()->create())
        ->getJson("/api/events/{$event->id}/attendees")
        ->assertOk();
});

test('other organizers and students cannot view attendees', function (string $role) {
    $event = Event::factory()->create();

    $this->actingAs(User::factory()->create(['role' => $role]))
        ->getJson("/api/events/{$event->id}/attendees")
        ->assertForbidden();
})->with(['organizer', 'student']);
