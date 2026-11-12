<?php

namespace App\Mail;

use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

// "Your ticket" email sent when a student reserves, or is promoted from the waitlist
class TicketReserved extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Ticket $ticket, public bool $fromWaitlist = false) {}

    public function envelope(): Envelope
    {
        $title = $this->ticket->event->title;

        return new Envelope(
            subject: $this->fromWaitlist
                ? "A slot opened up: your ticket for {$title}"
                : "Your ticket for {$title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.ticket-reserved',
            with: [
                'event' => $this->ticket->event,
                'startsAt' => $this->ticket->event->start_at->timezone('Asia/Manila')->format('l, F j, Y \a\t g:i A'),
            ],
        );
    }
}
