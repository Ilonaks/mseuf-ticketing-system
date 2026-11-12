<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // POST /api/register
    public function register(Request $request)
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100', "regex:/^[\pL\s.'-]+$/u"],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'student_id' => ['nullable', 'string', 'regex:/^\d{4}-\d{5}$/', 'unique:users'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->numbers()],
            'device_name' => ['nullable', 'string', 'max:255'],
        ], [
            'name.regex' => 'The name may only contain letters, spaces, periods, apostrophes, and hyphens.',
            'student_id.regex' => 'The student ID must look like 2023-00001.',
            'student_id.unique' => 'This student ID is already registered.',
            'email.unique' => 'An account with this email already exists.',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'student_id' => $validated['student_id'] ?? null,
            'password' => $validated['password'], // hashed automatically by the model
            'role' => 'student', // new accounts are always students
        ]);

        $token = $this->startSession($user, $validated['device_name'] ?? 'api');

        return response()->json([
            'message' => 'Registered successfully.',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    // POST /api/login
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::where('email', strtolower(trim($validated['email'])))->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Was the account signed in somewhere else? That device gets logged out.
        $hadOtherSession = $user->current_token_id
            && $user->tokens()->whereKey($user->current_token_id)->exists();

        $token = $this->startSession($user, $validated['device_name'] ?? 'api');

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => $user,
            'token' => $token,
            'signed_out_other_device' => (bool) $hadOtherSession,
        ]);
    }

    // POST /api/logout (requires token)
    public function logout(Request $request)
    {
        $user = $request->user();
        $token = $user->currentAccessToken();

        if ($user->current_token_id === $token->id) {
            $user->forceFill(['current_token_id' => null])->save();
        }
        $token->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Issues a login token and makes it the only active one for this account
     * (one device at a time). Older tokens are rejected by EnsureSingleSession.
     */
    private function startSession(User $user, string $deviceName): string
    {
        $newToken = $user->createToken($deviceName);

        // Old tokens are kept until their device calls the API once more, so that
        // device can be told *why* it was logged out (see EnsureSingleSession)
        $user->forceFill(['current_token_id' => $newToken->accessToken->id])->save();

        return $newToken->plainTextToken;
    }

    // GET /api/me (requires token)
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
