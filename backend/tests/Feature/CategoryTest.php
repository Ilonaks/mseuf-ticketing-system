<?php

use App\Models\Category;
use App\Models\Event;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('logged-in users can list categories', function () {
    $this->seed(CategorySeeder::class);

    $this->actingAs(User::factory()->create())
        ->getJson('/api/categories')
        ->assertOk()
        ->assertJsonCount(6)
        ->assertJsonStructure([['id', 'name', 'color']]);
});

test('the category seeder can run twice without duplicates', function () {
    $this->seed(CategorySeeder::class);
    $this->seed(CategorySeeder::class);

    expect(Category::count())->toBe(6);
});

test('events can be created with a category and list it', function () {
    $category = Category::factory()->create(['name' => 'Sports']);
    $organizer = User::factory()->organizer()->create();

    $this->actingAs($organizer)->postJson('/api/events', [
        'title' => 'Intramurals',
        'venue' => 'Oval',
        'start_at' => now()->addDays(3)->toIso8601String(),
        'end_at' => now()->addDays(3)->addHours(2)->toIso8601String(),
        'capacity' => 50,
        'category_id' => $category->id,
    ])->assertCreated();

    $this->actingAs($organizer)
        ->getJson('/api/events')
        ->assertJsonPath('0.category.name', 'Sports');
});

test('an unknown category is rejected', function () {
    $event = Event::factory()->create();

    $this->actingAs($event->organizer)
        ->putJson("/api/events/{$event->id}", [
            'title' => $event->title,
            'venue' => $event->venue,
            'start_at' => $event->start_at->toIso8601String(),
            'end_at' => $event->end_at->toIso8601String(),
            'capacity' => $event->capacity,
            'category_id' => 999,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('category_id');
});
