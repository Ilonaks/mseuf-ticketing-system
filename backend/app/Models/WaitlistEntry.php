<?php

namespace App\Models;

use Database\Factories\WaitlistEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'event_id'])]
class WaitlistEntry extends Model
{
    /** @use HasFactory<WaitlistEntryFactory> */
    use HasFactory;

    // The student waiting for a slot
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // The sold-out event they are waiting for
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
