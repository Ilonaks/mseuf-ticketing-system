<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;

class EventPolicy
{
    // Anyone logged in can see the events list
    public function viewAny(User $user): bool
    {
        return true;
    }

    // Published events are visible to all; drafts only to the owner or admin
    public function view(User $user, Event $event): bool
    {
        return $event->status === 'published'
            || $user->isAdmin()
            || $event->user_id === $user->id;
    }

    // Only admins and organizers can create events
    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isOrganizer();
    }

    // Admins can edit any event; organizers only their own
    public function update(User $user, Event $event): bool
    {
        return $user->isAdmin()
            || ($user->isOrganizer() && $event->user_id === $user->id);
    }

    // Same rule as update
    public function delete(User $user, Event $event): bool
    {
        return $this->update($user, $event);
    }
}