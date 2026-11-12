<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create(['email' => 'juan@mseuf.edu.ph', 'password' => 'password123']);
});

// Logs in like a device would and returns the token
function loginFrom(string $device): string
{
    return test()->postJson('/api/login', [
        'email' => 'juan@mseuf.edu.ph',
        'password' => 'password123',
        'device_name' => $device,
    ])->json('token');
}

// Calls the API with a device's token (forgetting the previous request's user)
function asDevice(string $token): TestResponse
{
    app('auth')->forgetGuards();

    return test()->withToken($token)->getJson('/api/me');
}

test('logging in on a second device logs the first device out with a reason', function () {
    $phone = loginFrom('phone');
    asDevice($phone)->assertOk();

    $laptopLogin = $this->postJson('/api/login', [
        'email' => 'juan@mseuf.edu.ph',
        'password' => 'password123',
        'device_name' => 'laptop',
    ])->assertOk()->assertJsonPath('signed_out_other_device', true);
    $laptop = $laptopLogin->json('token');

    asDevice($phone)
        ->assertUnauthorized()
        ->assertJsonPath('reason', 'session_replaced')
        ->assertJsonPath('message', 'Your account was logged in on another device, so you were logged out here.');

    asDevice($laptop)->assertOk()->assertJsonPath('email', 'juan@mseuf.edu.ph');
});

test('the replaced token stops working for good', function () {
    $phone = loginFrom('phone');
    loginFrom('laptop');

    asDevice($phone)->assertUnauthorized()->assertJsonPath('reason', 'session_replaced');
    // Its token was deleted, so after that it is simply unauthenticated
    asDevice($phone)->assertUnauthorized()->assertJsonMissingPath('reason');
});

test('the first login reports no other device', function () {
    $this->postJson('/api/login', ['email' => 'juan@mseuf.edu.ph', 'password' => 'password123'])
        ->assertJsonPath('signed_out_other_device', false);
});

test('logging back in on the old device takes the session back', function () {
    $phone = loginFrom('phone');
    $laptop = loginFrom('laptop');
    $phoneAgain = loginFrom('phone');

    asDevice($laptop)->assertUnauthorized()->assertJsonPath('reason', 'session_replaced');
    asDevice($phoneAgain)->assertOk();
    asDevice($phone)->assertUnauthorized();
});

test('logging out frees the account without affecting a later login', function () {
    $phone = loginFrom('phone');
    app('auth')->forgetGuards();
    $this->withToken($phone)->postJson('/api/logout')->assertOk();

    expect($this->user->refresh()->current_token_id)->toBeNull();

    $this->postJson('/api/login', ['email' => 'juan@mseuf.edu.ph', 'password' => 'password123'])
        ->assertJsonPath('signed_out_other_device', false);
});

test('a newly registered account is signed in on that device only', function () {
    $token = $this->postJson('/api/register', [
        'name' => 'Maria Clara',
        'email' => 'maria@mseuf.edu.ph',
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
    ])->assertCreated()->json('token');

    asDevice($token)->assertOk()->assertJsonMissingPath('current_token_id');
});
