<?php

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(fn () => Storage::fake('public'));

test('the organizer can upload a poster and anyone can view it once published', function () {
    $event = Event::factory()->create();

    $response = $this->actingAs($event->organizer)
        ->post("/api/events/{$event->id}/poster", ['poster' => UploadedFile::fake()->image('poster.jpg', 800, 600)], ['Accept' => 'application/json'])
        ->assertOk();

    $event->refresh();
    Storage::disk('public')->assertExists($event->poster_path);
    expect($response->json('poster_url'))->toStartWith("/events/{$event->id}/poster?v=");

    // No token needed to load the image
    auth()->forgetGuards();
    $this->get("/api/events/{$event->id}/poster")->assertOk();
});

test('uploading a new poster deletes the old file', function () {
    $event = Event::factory()->create();

    $this->actingAs($event->organizer)
        ->post("/api/events/{$event->id}/poster", ['poster' => UploadedFile::fake()->image('a.png', 800, 600)], ['Accept' => 'application/json']);
    $first = $event->refresh()->poster_path;

    $this->actingAs($event->organizer)
        ->post("/api/events/{$event->id}/poster", ['poster' => UploadedFile::fake()->image('b.png', 800, 600)], ['Accept' => 'application/json']);

    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($event->refresh()->poster_path);
});

test('invalid posters are rejected', function (UploadedFile $file) {
    $event = Event::factory()->create();

    $this->actingAs($event->organizer)
        ->post("/api/events/{$event->id}/poster", ['poster' => $file], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('poster');
})->with([
    'not an image' => fn () => UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'),
    'too small' => fn () => UploadedFile::fake()->image('tiny.jpg', 100, 100),
    'too large' => fn () => UploadedFile::fake()->image('huge.jpg', 800, 600)->size(4000),
]);

test('other organizers cannot change the poster', function () {
    $event = Event::factory()->create();

    $this->actingAs(User::factory()->organizer()->create())
        ->post("/api/events/{$event->id}/poster", ['poster' => UploadedFile::fake()->image('p.jpg', 800, 600)], ['Accept' => 'application/json'])
        ->assertForbidden();
});

test('draft posters are hidden and posters can be removed', function () {
    $event = Event::factory()->draft()->create();
    $this->actingAs($event->organizer)
        ->post("/api/events/{$event->id}/poster", ['poster' => UploadedFile::fake()->image('p.jpg', 800, 600)], ['Accept' => 'application/json']);
    $path = $event->refresh()->poster_path;

    $this->get("/api/events/{$event->id}/poster")->assertNotFound();

    $this->actingAs($event->organizer)->deleteJson("/api/events/{$event->id}/poster")->assertOk();
    Storage::disk('public')->assertMissing($path);
    expect($event->refresh()->poster_path)->toBeNull();
});

test('deleting an event deletes its poster file', function () {
    $event = Event::factory()->create();
    $this->actingAs($event->organizer)
        ->post("/api/events/{$event->id}/poster", ['poster' => UploadedFile::fake()->image('p.jpg', 800, 600)], ['Accept' => 'application/json']);
    $path = $event->refresh()->poster_path;

    $this->actingAs($event->organizer)->deleteJson("/api/events/{$event->id}")->assertOk();

    Storage::disk('public')->assertMissing($path);
});
