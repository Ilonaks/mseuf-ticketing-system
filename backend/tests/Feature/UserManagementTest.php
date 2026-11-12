<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an admin can list and filter users', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->count(2)->create();
    User::factory()->organizer()->create(['name' => 'Student Council']);

    $this->actingAs($admin)
        ->getJson('/api/users')
        ->assertOk()
        ->assertJsonCount(4);

    $this->actingAs($admin)
        ->getJson('/api/users?role=organizer')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Student Council');

    $this->actingAs($admin)
        ->getJson('/api/users?search=council')
        ->assertOk()
        ->assertJsonCount(1);
});

test('an admin can make a student an organizer', function () {
    $student = User::factory()->create();

    $this->actingAs(User::factory()->admin()->create())
        ->patchJson("/api/users/{$student->id}/role", ['role' => 'organizer'])
        ->assertOk()
        ->assertJsonPath('user.role', 'organizer');

    expect($student->refresh()->role)->toBe('organizer');
});

test('an admin cannot change their own role', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->patchJson("/api/users/{$admin->id}/role", ['role' => 'student'])
        ->assertUnprocessable();

    expect($admin->refresh()->role)->toBe('admin');
});

test('an invalid role is rejected', function () {
    $student = User::factory()->create();

    $this->actingAs(User::factory()->admin()->create())
        ->patchJson("/api/users/{$student->id}/role", ['role' => 'superuser'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('role');
});

test('non-admins cannot manage users', function (string $role) {
    $actor = User::factory()->create(['role' => $role]);
    $student = User::factory()->create();

    $this->actingAs($actor)->getJson('/api/users')->assertForbidden();

    $this->actingAs($actor)
        ->patchJson("/api/users/{$student->id}/role", ['role' => 'organizer'])
        ->assertForbidden();

    expect($student->refresh()->role)->toBe('student');
})->with(['organizer', 'student']);
