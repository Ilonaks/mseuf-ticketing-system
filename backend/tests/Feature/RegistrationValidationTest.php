<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function registration(array $overrides = []): array
{
    return array_merge([
        'name' => 'Maria Clara',
        'email' => 'maria@mseuf.edu.ph',
        'student_id' => '2024-00042',
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
    ], $overrides);
}

test('a valid student can register', function () {
    $this->postJson('/api/register', registration())
        ->assertCreated()
        ->assertJsonPath('user.role', 'student');
});

test('emails are stored in lowercase and must be unique regardless of case', function () {
    $this->postJson('/api/register', registration(['email' => '  Maria@MSEUF.edu.ph ']))->assertCreated();

    expect(User::first()->email)->toBe('maria@mseuf.edu.ph');

    $this->postJson('/api/register', registration(['email' => 'MARIA@mseuf.edu.ph', 'student_id' => null]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('invalid registration fields are rejected', function (array $overrides, string $field) {
    $this->postJson('/api/register', registration($overrides))
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'name with digits' => [['name' => 'M4ria'], 'name'],
    'name too short' => [['name' => 'M'], 'name'],
    'bad email' => [['email' => 'not-an-email'], 'email'],
    'bad student id' => [['student_id' => '12345'], 'student_id'],
    'short password' => [['password' => 'abc12', 'password_confirmation' => 'abc12'], 'password'],
    'password without numbers' => [['password' => 'onlyletters', 'password_confirmation' => 'onlyletters'], 'password'],
    'mismatched confirmation' => [['password_confirmation' => 'different1'], 'password'],
]);

test('login is case-insensitive on email', function () {
    User::factory()->create(['email' => 'juan@mseuf.edu.ph', 'password' => 'password123']);

    $this->postJson('/api/login', ['email' => 'JUAN@mseuf.edu.ph', 'password' => 'password123'])
        ->assertOk();
});

test('login attempts are rate limited', function () {
    foreach (range(1, 10) as $attempt) {
        $this->postJson('/api/login', ['email' => 'x@mseuf.edu.ph', 'password' => 'wrong'])->assertUnprocessable();
    }

    $this->postJson('/api/login', ['email' => 'x@mseuf.edu.ph', 'password' => 'wrong'])
        ->assertTooManyRequests();
});
