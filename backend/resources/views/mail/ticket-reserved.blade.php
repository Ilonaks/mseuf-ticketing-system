<x-mail::message>
# {{ $fromWaitlist ? 'Good news, a slot opened up!' : 'Your ticket is reserved' }}

Hi {{ $ticket->user->name }},

@if ($fromWaitlist)
Someone cancelled, so you were next on the waitlist for **{{ $event->title }}**. Your ticket is ready.
@else
You're going to **{{ $event->title }}**.
@endif

<x-mail::panel>
**Ticket code:** {{ $ticket->ticket_code }}<br>
**When:** {{ $startsAt }}<br>
**Where:** {{ $event->venue }}<br>
**Price:** {{ (float) $event->price === 0.0 ? 'Free' : '₱'.number_format((float) $event->price, 2) }}
</x-mail::panel>

Open **My Tickets** in the MSEUF Events app and show the QR code at the entrance.
If you can't make it, please cancel the ticket so the slot goes to someone on the waitlist.

Thanks,<br>
MSEUF Events
</x-mail::message>
