<?php

use App\Models\Event;
use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a student can cancel a reserved ticket before the event starts', function () {
    $ticket = Ticket::factory()->create();

    $this->actingAs($ticket->user)
        ->patchJson("/api/tickets/{$ticket->id}/cancel")
        ->assertOk();

    expect($ticket->refresh()->status)->toBe('cancelled');
});

test('a ticket cannot be cancelled after the event has started', function () {
    $event = Event::factory()->create(['start_at' => now()->subHour(), 'end_at' => now()->addHour()]);
    $ticket = Ticket::factory()->for($event)->create();

    $this->actingAs($ticket->user)
        ->patchJson("/api/tickets/{$ticket->id}/cancel")
        ->assertUnprocessable();

    expect($ticket->refresh()->status)->toBe('reserved');
});

test('a used ticket cannot be cancelled', function () {
    $ticket = Ticket::factory()->used()->create();

    $this->actingAs($ticket->user)
        ->patchJson("/api/tickets/{$ticket->id}/cancel")
        ->assertUnprocessable();
});

test('students cannot cancel someone else\'s ticket', function () {
    $ticket = Ticket::factory()->create();
    $other = Ticket::factory()->create();

    $this->actingAs($other->user)
        ->patchJson("/api/tickets/{$ticket->id}/cancel")
        ->assertForbidden();
});
