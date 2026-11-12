<?php

use App\Models\Event;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('the organizer can download the attendee list as CSV', function () {
    $event = Event::factory()->create(['title' => 'Foundation Week Concert']);
    $student = User::factory()->create(['name' => 'Juan Dela Cruz', 'student_id' => '2023-00001']);
    Ticket::factory()->for($event)->for($student)->used()->create(['ticket_code' => 'MSEUF-ABCD1234']);

    $response = $this->actingAs($event->organizer)
        ->get("/api/events/{$event->id}/attendees/export")
        ->assertOk()
        ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
        ->assertDownload('foundation-week-concert-attendees.csv');

    $csv = $response->streamedContent();
    expect($csv)
        ->toContain('Name,"Student ID",Email,"Ticket code",Status')
        ->toContain('"Juan Dela Cruz",2023-00001')
        ->toContain('MSEUF-ABCD1234,"checked in"');
});

test('cells that look like formulas are neutralized', function () {
    $event = Event::factory()->create();
    $student = User::factory()->create(['name' => '=HYPERLINK("http://evil")']);
    Ticket::factory()->for($event)->for($student)->create();

    $csv = $this->actingAs($event->organizer)
        ->get("/api/events/{$event->id}/attendees/export")
        ->streamedContent();

    expect($csv)->toContain("'=HYPERLINK");
});

test('students and other organizers cannot export attendees', function (string $role) {
    $event = Event::factory()->create();

    $this->actingAs(User::factory()->create(['role' => $role]))
        ->get("/api/events/{$event->id}/attendees/export", ['Accept' => 'application/json'])
        ->assertForbidden();
})->with(['student', 'organizer']);
