<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\EventPosterController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WaitlistController;
use Illuminate\Support\Facades\Route;

// Public routes (no login needed); limited to 10 attempts a minute to slow down password guessing
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// Event posters are public so <img> tags can load them (drafts return 404)
Route::get('/events/{event}/poster', [EventPosterController::class, 'show']);

// Protected routes (must send a Sanctum token)
Route::middleware(['auth:sanctum', 'single.session'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Events
    Route::apiResource('events', EventController::class);
    Route::get('/events/{event}/attendees', [TicketController::class, 'attendees']);
    Route::get('/events/{event}/attendees/export', [TicketController::class, 'exportAttendees']);
    Route::post('/events/{event}/poster', [EventPosterController::class, 'store']);
    Route::delete('/events/{event}/poster', [EventPosterController::class, 'destroy']);
    Route::get('/categories', [CategoryController::class, 'index']);

    // Waitlist for sold-out events (students)
    Route::post('/events/{event}/waitlist', [WaitlistController::class, 'store']);
    Route::delete('/events/{event}/waitlist', [WaitlistController::class, 'destroy']);

    // Tickets
    Route::get('/tickets', [TicketController::class, 'index']);
    Route::get('/tickets/{ticket}', [TicketController::class, 'show']);
    Route::post('/events/{event}/tickets', [TicketController::class, 'store']);
    Route::patch('/tickets/{ticket}/cancel', [TicketController::class, 'cancel']);

    // Check-in (organizers and admins scan a ticket's QR code)
    Route::post('/check-in', [TicketController::class, 'checkIn']);

    // Reports (admins: all events, organizers: their own)
    Route::get('/reports', [ReportController::class, 'index']);

    // User management (admins only)
    Route::get('/users', [UserController::class, 'index']);
    Route::patch('/users/{user}/role', [UserController::class, 'updateRole']);
});
