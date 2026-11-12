<?php

use App\Mail\TicketReserved;
use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

test('reserving a ticket emails the student their ticket code', function () {
    Mail::fake();
    $event = Event::factory()->create(['title' => 'IT Days']);
    $student = User::factory()->create();

    $code = $this->actingAs($student)
        ->postJson("/api/events/{$event->id}/tickets")
        ->assertCreated()
        ->json('ticket.ticket_code');

    Mail::assertSent(TicketReserved::class, function (TicketReserved $mail) use ($student, $code) {
        return $mail->hasTo($student->email)
            && ! $mail->fromWaitlist
            && $mail->ticket->ticket_code === $code;
    });
});

test('the ticket email shows the event details and code', function () {
    $event = Event::factory()->create(['title' => 'IT Days', 'venue' => 'AVR', 'price' => 0]);
    $student = User::factory()->create();
    $ticket = $event->issueTicketTo($student);

    $html = (new TicketReserved($ticket))->render();

    expect($html)
        ->toContain('IT Days')
        ->toContain('AVR')
        ->toContain($ticket->ticket_code)
        ->toContain('Free');
    expect((new TicketReserved($ticket))->envelope()->subject)->toBe('Your ticket for IT Days');
});

test('a mail failure does not undo the reservation', function () {
    Mail::shouldReceive('to')->andThrow(new RuntimeException('SMTP down'));
    $event = Event::factory()->create();
    $student = User::factory()->create();

    $this->actingAs($student)->postJson("/api/events/{$event->id}/tickets")->assertCreated();

    expect($event->activeTicketCount())->toBe(1);
});
