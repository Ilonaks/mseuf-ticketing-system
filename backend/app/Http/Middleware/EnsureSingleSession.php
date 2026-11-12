<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * One device per account: only the token from the most recent login may be used.
 * A request with an older token ends that session and tells the device why,
 * so the app can show "your account was logged in on another device".
 */
class EnsureSingleSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();

        // Only real API tokens are checked (tests using actingAs have none)
        if ($token instanceof PersonalAccessToken
            && $user->current_token_id !== null
            && $token->id !== $user->current_token_id) {
            $token->delete();

            return response()->json([
                'message' => 'Your account was logged in on another device, so you were logged out here.',
                'reason' => 'session_replaced',
            ], 401);
        }

        return $next($request);
    }
}
