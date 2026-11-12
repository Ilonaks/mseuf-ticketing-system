<?php

namespace App\Http\Controllers;

use App\Mail\TicketReserved;
use App\Models\Ticket;
use Illuminate\Support\Facades\Mail;
use Throwable;

abstract class Controller
{
    /**
     * Emails the ticket to its owner. A mail failure must not undo the reservation,
     * so errors are logged instead of thrown.
     */
    protected function sendTicketEmail(Ticket $ticket, bool $fromWaitlist = false): void
    {
        try {
            Mail::to($ticket->user)->send(new TicketReserved($ticket, $fromWaitlist));
        } catch (Throwable $e) {
            report($e);
        }
    }
}
