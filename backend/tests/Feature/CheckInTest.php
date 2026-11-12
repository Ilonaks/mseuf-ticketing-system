<?php

use App\Models\Event;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('the event organizer can check in a reserved ticket', function () {
    $ticket = Ticket::factory()->for(Event::factory()->happeningNow())->create();

    $this->actingAs($ticket->event->organizer)
        ->postJson('/api/check-in', ['ticket_code' => $ticket->ticket_code])
        ->assertOk()
        ->assertJsonPath('ticket.status', 'used')
        ->assertJsonPath('ticket.user.id', $ticket->user_id);

    expect($ticket->refresh())
        ->status->toBe('used')
        ->checked_in_at->not->toBeNull();
});

test('codes are matched regardless of case and surrounding spaces', function () {
    $ticket = Ticket::factory()->for(Event::factory()->happeningNow())->create(['ticket_code' => 'MSEUF-ABCD1234']);

    $this->actingAs($ticket->event->organizer)
        ->postJson('/api/check-in', ['ticket_code' => '  mseuf-abcd1234 '])
        ->assertOk();
});

test('an admin can check in tickets for an event they created', function () {
    $admin = User::factory()->admin()->create();
    $event = Event::factory()->happeningNow()->for($admin, 'organizer')->create();
    $ticket = Ticket::factory()->for($event)->create();

    $this->actingAs($admin)
        ->postJson('/api/check-in', ['ticket_code' => $ticket->ticket_code])
        ->assertOk();
});

test('an admin cannot check in tickets for an event someone else created', function () {
    $ticket = Ticket::factory()->for(Event::factory()->happeningNow())->create();

    $this->actingAs(User::factory()->admin()->create())
        ->postJson('/api/check-in', ['ticket_code' => $ticket->ticket_code])
        ->assertForbidden();

    expect($ticket->refresh()->status)->toBe('reserved');
});

test('the creator loses check-in rights if demoted to student', function () {
    $ticket = Ticket::factory()->for(Event::factory()->happeningNow())->create();
    $creator = $ticket->event->organizer;
    $creator->update(['role' => 'student']);

    $this->actingAs($creator)
        ->postJson('/api/check-in', ['ticket_code' => $ticket->ticket_code])
        ->assertForbidden();
});

test('a ticket cannot be checked in twice', function () {
    $ticket = Ticket::factory()->for(Event::factory()->happeningNow())->used()->create();

    $this->actingAs($ticket->event->organizer)
        ->postJson('/api/check-in', ['ticket_code' => $ticket->ticket_code])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('ticket_code');
});

test('a cancelled ticket is rejected', function () {
    $ticket = Ticket::factory()->for(Event::factory()->happeningNow())->cancelled()->create();

    $this->actingAs($ticket->event->organizer)
        ->postJson('/api/check-in', ['ticket_code' => $ticket->ticket_code])
        ->assertUnprocessable();

    expect($ticket->refresh()->status)->toBe('cancelled');
});

test('an unknown code is rejected', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->postJson('/api/check-in', ['ticket_code' => 'MSEUF-NOTREAL1'])
        ->assertUnprocessable();
});

test('a ticket for a different event is rejected when scanning at a specific event', function () {
    $ticket = Ticket::factory()->for(Event::factory()->happeningNow())->create();
    $otherEvent = Event::factory()->for($ticket->event->organizer, 'organizer')->create();

    $this->actingAs($ticket->event->organizer)
        ->postJson('/api/check-in', ['ticket_code' => $ticket->ticket_code, 'event_id' => $otherEvent->id])
        ->assertUnprocessable();

    expect($ticket->refresh()->status)->toBe('reserved');
});

test('an organizer cannot check in tickets for another organizer\'s event', function () {
    $ticket = Ticket::factory()->for(Event::factory()->happeningNow())->create();

    $this->actingAs(User::factory()->organizer()->create())
        ->postJson('/api/check-in', ['ticket_code' => $ticket->ticket_code])
        ->assertForbidden();

    expect($ticket->refresh()->status)->toBe('reserved');
});

test('students cannot check in tickets', function () {
    $ticket = Ticket::factory()->for(Event::factory()->happeningNow())->create();

    $this->actingAs($ticket->user)
        ->postJson('/api/check-in', ['ticket_code' => $ticket->ticket_code])
        ->assertForbidden();
});

test('tickets cannot be checked in before the check-in window opens', function () {
    $event = Event::factory()->create(['start_at' => now()->addDays(5), 'end_at' => now()->addDays(5)->addHours(4)]);
    $ticket = Ticket::factory()->for($event)->create();

    $this->actingAs($event->organizer)
        ->postJson('/api/check-in', ['ticket_code' => $ticket->ticket_code])
        ->assertUnprocessable()
        ->assertJsonPath('errors.ticket_code.0', fn (string $message) => str_starts_with($message, 'Too early.'));

    expect($ticket->refresh()->status)->toBe('reserved');
});

test('tickets cannot be checked in after the event has ended', function () {
    $event = Event::factory()->create(['start_at' => now()->subDays(2), 'end_at' => now()->subDays(2)->addHours(4)]);
    $ticket = Ticket::factory()->for($event)->create();

    $this->actingAs($event->organizer)
        ->postJson('/api/check-in', ['ticket_code' => $ticket->ticket_code])
        ->assertUnprocessable()
        ->assertJsonPath('errors.ticket_code.0', fn (string $message) => str_contains($message, 'check-in is closed'));

    expect($ticket->refresh()->status)->toBe('reserved');
});

test('check-in opens shortly before the start time and closes at the end time', function () {
    $start = now()->addMinutes(Event::CHECK_IN_OPENS_MINUTES_BEFORE)->addMinute();
    $event = Event::factory()->create(['start_at' => $start, 'end_at' => $start->copy()->addHours(3)]);
    $ticket = Ticket::factory()->for($event)->create();
    $checkIn = fn () => $this->actingAs($event->organizer)->postJson('/api/check-in', ['ticket_code' => $ticket->ticket_code]);

    $checkIn()->assertUnprocessable(); // one minute before doors open

    $this->travel(2)->minutes(); // doors are open now
    $checkIn()->assertOk();

    // Compared to the second: the database doesn't keep fractions of a second
    expect($event->check_in_opens_at->toDateTimeString())
        ->toBe($start->copy()->subMinutes(Event::CHECK_IN_OPENS_MINUTES_BEFORE)->toDateTimeString());
});

test('events include when check-in opens', function () {
    $event = Event::factory()->create();

    $this->actingAs($event->organizer)
        ->getJson("/api/events/{$event->id}")
        ->assertJsonPath('check_in_opens_at', $event->start_at->copy()->subMinutes(Event::CHECK_IN_OPENS_MINUTES_BEFORE)->toJSON());
});
