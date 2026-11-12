<?php

namespace App\Models;

use Database\Factories\TicketFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable([
    'user_id',
    'event_id',
    'ticket_code',
    'status',
    'checked_in_at',
])]
class Ticket extends Model
{
    /** @use HasFactory<TicketFactory> */
    use HasFactory;

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

    // Generates a unique code like MSEUF-A8K2PX9Q
    public static function generateCode(): string
    {
        do {
            $code = 'MSEUF-'.strtoupper(Str::random(8));
        } while (static::where('ticket_code', $code)->exists());

        return $code;
    }
}
