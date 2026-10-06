<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'event_id',
    'ticket_code',
    'status',
    'checked_in_at',
])]
class Ticket extends Model
{
    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
        ];
    }

    // The student who owns this ticket
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // The event this ticket is for
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}