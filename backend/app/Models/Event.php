<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'title',
    'description',
    'venue',
    'start_at',
    'end_at',
    'capacity',
    'price',
    'status',
])]
class Event extends Model
{
    protected function casts(): array
    {
        return [
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'capacity' => 'integer',
            'price' => 'decimal:2',
        ];
    }

    // The organizer who created this event
    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // All tickets issued for this event
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }
}