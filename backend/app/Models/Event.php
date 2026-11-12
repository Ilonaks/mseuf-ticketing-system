<?php

namespace App\Models;

use Database\Factories\EventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

#[Fillable([
    'user_id',
    'category_id',
    'title',
    'description',
    'venue',
    'start_at',
    'end_at',
    'capacity',
    'price',
    'status',
    'poster_path',
])]
#[Hidden(['poster_path'])]
class Event extends Model
{
    /** @use HasFactory<EventFactory> */
    use HasFactory;

    /**
     * Doors open this many minutes before the start time; check-in closes when the event ends.
     */
    public const CHECK_IN_OPENS_MINUTES_BEFORE = 120;

    /** @var list<string> */
    protected $appends = ['poster_url', 'check_in_opens_at'];

    protected function casts(): array
    {
        return [
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'capacity' => 'integer',
            'price' => 'decimal:2',
        ];
    }

    /**
     * Poster address relative to the API base (e.g. "/events/3/poster?v=1700000000"),
     * so web and mobile can each prefix their own API URL. Null when there is no poster.
     * The "v" changes whenever the event is saved, so browsers fetch a replaced poster.
     */
    protected function posterUrl(): Attribute
    {
        return Attribute::get(fn () => $this->poster_path
            ? "/events/{$this->id}/poster?v=".($this->updated_at?->timestamp ?? 0)
            : null);
    }

    /**
     * When the entrance starts accepting tickets (sent to the apps so they can show it).
     */
    protected function checkInOpensAt(): Attribute
    {
        return Attribute::get(fn () => $this->start_at?->copy()->subMinutes(self::CHECK_IN_OPENS_MINUTES_BEFORE));
    }

    /**
     * Why a ticket can't be checked in right now, or null if the gate is open.
     */
    public function checkInClosedReason(): ?string
    {
        $now = now();
        $local = fn ($time) => $time->timezone('Asia/Manila')->format('M j, Y \a\t g:i A');

        if ($now->lt($this->check_in_opens_at)) {
            return 'Too early. Check-in for this event opens '.$local($this->check_in_opens_at).'.';
        }

        if ($now->gt($this->end_at)) {
            return 'This event ended '.$local($this->end_at).', so check-in is closed.';
        }

        return null;
    }

    // The organizer who created this event
    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // The category this event is filed under (optional)
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    // All tickets issued for this event
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    // Students waiting for a slot, oldest first
    public function waitlist(): HasMany
    {
        return $this->hasMany(WaitlistEntry::class)->orderBy('created_at')->orderBy('id');
    }

    // Tickets that still count against capacity (reserved or used)
    public function activeTicketCount(): int
    {
        return $this->tickets()->where('status', '!=', 'cancelled')->count();
    }

    /**
     * Gives the user a reserved ticket, re-activating their cancelled one if it exists
     * (one ticket row per student per event). Callers check capacity first.
     */
    public function issueTicketTo(User $user): Ticket
    {
        $existing = $this->tickets()->where('user_id', $user->id)->first();

        if ($existing) {
            $existing->update([
                'status' => 'reserved',
                'ticket_code' => Ticket::generateCode(),
                'checked_in_at' => null,
            ]);

            return $existing;
        }

        return $this->tickets()->create([
            'user_id' => $user->id,
            'ticket_code' => Ticket::generateCode(),
            'status' => 'reserved',
        ]);
    }

    /**
     * Fills free slots from the waitlist, first come first served.
     * Called after a ticket is cancelled or capacity is raised.
     *
     * @return list<Ticket> the tickets issued to promoted students
     */
    public function promoteWaitlist(): array
    {
        if ($this->status !== 'published' || $this->start_at->isPast()) {
            return [];
        }

        return DB::transaction(function () {
            $promoted = [];
            $freeSlots = $this->capacity - $this->activeTicketCount();

            foreach ($this->waitlist()->with('user')->get() as $entry) {
                if ($freeSlots <= 0) {
                    break;
                }

                $alreadyHasTicket = $this->tickets()
                    ->where('user_id', $entry->user_id)
                    ->where('status', '!=', 'cancelled')
                    ->exists();

                $entry->delete();

                if (! $alreadyHasTicket) {
                    $promoted[] = $this->issueTicketTo($entry->user);
                    $freeSlots--;
                }
            }

            return $promoted;
        });
    }
}
