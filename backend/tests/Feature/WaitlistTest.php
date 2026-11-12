<?php

use App\Mail\TicketReserved;
use App\Models\Event;
use App\Models\Ticket;
use App\Models\User;
use App\Models\WaitlistEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(fn () => Mail::fake());

function soldOutEvent(int $capacity = 1): Event
{
    $event = Event::factory()->create(['capacity' => $capacity]);
    Ticket::factory()->for($event)->count($capacity)->create();

    return $event;
}

test('a student can join the waitlist of a sold-out event and sees their position', function () {
    $event = soldOutEvent();
    $first = User::factory()->create();
    $second = User::factory()->create();

    $this->actingAs($first)->postJson("/api/events/{$event->id}/waitlist")->assertCreated()->assertJsonPath('position', 1);
    $this->actingAs($second)->postJson("/api/events/{$event->id}/waitlist")->assertCreated()->assertJsonPath('position', 2);

    $this->actingAs($second)
        ->getJson("/api/events/{$event->id}")
        ->assertJsonPath('on_waitlist', true)
        ->assertJsonPath('waitlist_position', 2)
        ->assertJsonPath('waitlist_count', 2);
});

test('the waitlist is only for sold-out events and only once per student', function () {
    $open = Event::factory()->create(['capacity' => 5]);
    $student = User::factory()->create();

    $this->actingAs($student)->postJson("/api/events/{$open->id}/waitlist")->assertUnprocessable();

    $full = soldOutEvent();
    $this->actingAs($student)->postJson("/api/events/{$full->id}/waitlist")->assertCreated();
    $this->actingAs($student)->postJson("/api/events/{$full->id}/waitlist")->assertUnprocessable();
});

test('ticket holders and non-students cannot join the waitlist', function () {
    $event = soldOutEvent();
    $holder = $event->tickets()->first()->user;

    $this->actingAs($holder)->postJson("/api/events/{$event->id}/waitlist")->assertUnprocessable();
    $this->actingAs(User::factory()->organizer()->create())->postJson("/api/events/{$event->id}/waitlist")->assertForbidden();
});

test('a student can leave the waitlist', function () {
    $event = soldOutEvent();
    $student = User::factory()->create();
    $this->actingAs($student)->postJson("/api/events/{$event->id}/waitlist");

    $this->actingAs($student)->deleteJson("/api/events/{$event->id}/waitlist")->assertOk();
    $this->actingAs($student)->deleteJson("/api/events/{$event->id}/waitlist")->assertUnprocessable();
});

test('cancelling a ticket gives the slot to the first student on the waitlist', function () {
    $event = soldOutEvent();
    $holderTicket = $event->tickets()->first();
    $first = User::factory()->create();
    $second = User::factory()->create();
    WaitlistEntry::factory()->for($event)->for($first)->create(['created_at' => now()->subMinutes(5)]);
    WaitlistEntry::factory()->for($event)->for($second)->create();

    $this->actingAs($holderTicket->user)->patchJson("/api/tickets/{$holderTicket->id}/cancel")->assertOk();

    expect(Ticket::where('event_id', $event->id)->where('user_id', $first->id)->value('status'))->toBe('reserved')
        ->and(Ticket::where('event_id', $event->id)->where('user_id', $second->id)->exists())->toBeFalse()
        ->and(WaitlistEntry::where('user_id', $first->id)->exists())->toBeFalse()
        ->and(WaitlistEntry::where('user_id', $second->id)->exists())->toBeTrue();

    Mail::assertSent(TicketReserved::class, fn ($mail) => $mail->hasTo($first->email) && $mail->fromWaitlist);
});

test('a promoted student who previously cancelled gets their ticket re-activated', function () {
    $event = soldOutEvent();
    $student = User::factory()->create();
    Ticket::factory()->for($event)->for($student)->cancelled()->create();
    WaitlistEntry::factory()->for($event)->for($student)->create();

    $holder = $event->tickets()->where('status', 'reserved')->first();
    $this->actingAs($holder->user)->patchJson("/api/tickets/{$holder->id}/cancel")->assertOk();

    expect(Ticket::where('event_id', $event->id)->where('user_id', $student->id)->count())->toBe(1)
        ->and(Ticket::where('event_id', $event->id)->where('user_id', $student->id)->value('status'))->toBe('reserved');
});

test('raising capacity promotes students from the waitlist', function () {
    $event = soldOutEvent(capacity: 1);
    $waiting = User::factory()->count(2)->create();
    foreach ($waiting as $i => $student) {
        WaitlistEntry::factory()->for($event)->for($student)->create(['created_at' => now()->addSeconds($i)]);
    }

    $this->actingAs($event->organizer)->putJson("/api/events/{$event->id}", [
        'title' => $event->title,
        'venue' => $event->venue,
        'start_at' => $event->start_at->toIso8601String(),
        'end_at' => $event->end_at->toIso8601String(),
        'capacity' => 3,
        'status' => 'published',
    ])->assertOk();

    expect($event->activeTicketCount())->toBe(3)
        ->and($event->waitlist()->count())->toBe(0);
    Mail::assertSent(TicketReserved::class, 2);
});

test('reserving a ticket directly removes the student from the waitlist', function () {
    $event = Event::factory()->create(['capacity' => 5]);
    $student = User::factory()->create();
    WaitlistEntry::factory()->for($event)->for($student)->create();

    $this->actingAs($student)->postJson("/api/events/{$event->id}/tickets")->assertCreated();

    expect(WaitlistEntry::where('user_id', $student->id)->exists())->toBeFalse();
});
