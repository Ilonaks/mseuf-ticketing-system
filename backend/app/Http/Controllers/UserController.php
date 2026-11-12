<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    // GET /api/users  (admins only; optional ?role= and ?search= filters)
    public function index(Request $request)
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'role' => ['nullable', 'in:admin,organizer,student'],
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $users = User::query()
            ->withCount(['tickets', 'events'])
            ->when($validated['role'] ?? null, fn ($query, $role) => $query->where('role', $role))
            ->when($validated['search'] ?? null, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('student_id', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->get();

        return response()->json($users);
    }

    // PATCH /api/users/{user}/role  (admins only)
    public function updateRole(Request $request, User $user)
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'role' => ['required', 'in:admin,organizer,student'],
        ]);

        // Stops an admin from locking themselves out of user management
        if ($user->id === $request->user()->id) {
            throw ValidationException::withMessages([
                'role' => ['You cannot change your own role.'],
            ]);
        }

        $user->update(['role' => $validated['role']]);

        return response()->json([
            'message' => "{$user->name} is now {$user->role}.",
            'user' => $user,
        ]);
    }

    private function ensureAdmin(Request $request): void
    {
        if (! $request->user()->isAdmin()) {
            abort(403, 'Only admins can manage users.');
        }
    }
}
