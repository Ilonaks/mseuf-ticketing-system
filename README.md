# MSEUF Events Ticketing System

A combined web and mobile ticketing system for Manuel S. Enverga University Foundation (MSEUF) events. Built with the MVC pattern.

**Status:** 100% (final)

## Tech Stack

| Layer | Technology |
|---|---|
| Backend (Model + Controller) | PHP 8.4, Laravel 13, Laravel Sanctum (API token auth) |
| Database | SQLite |
| Web frontend (View) | React + Vite (JavaScript) |
| Mobile frontend (View) | React Native + Expo SDK 58 |
| Tests | Pest (backend), Vitest + Testing Library (web) |
| Dev environment | Laravel Herd, Node.js |

## Project Structure

```
mseuf-ticketing-system/
├── backend/   Laravel API (models, migrations, controllers, policies, mail, tests)
├── web/       React + Vite web app
└── mobile/    React Native + Expo mobile app
```

## MVC Overview

- **Model:** `backend/app/Models` with Eloquent relationships
  - `User` has many `Event`s (organizer), `Ticket`s, and `WaitlistEntry`s
  - `Event` belongs to a `User` (organizer) and a `Category`; has many `Ticket`s and `WaitlistEntry`s
  - `Ticket` and `WaitlistEntry` each belong to a `User` and an `Event`
  - `Category` has many `Event`s
- **Controller:** `backend/app/Http/Controllers` (Auth, Event, EventPoster, Ticket, Waitlist, Category, Report, User)
- **View:** the React web app and the Expo mobile app, which consume the same JSON API
- **Authorization:** `backend/app/Policies/EventPolicy.php` (role-based permissions)
- **Mail:** `backend/app/Mail/TicketReserved.php` (ticket confirmation email)

## Features

**Authentication (Sanctum):** register (students), login, logout, current user, on web and mobile. Login and register are limited to 10 attempts per minute.

**One device per account:** logging in on a new device logs out the previous one. The old device shows "Logged in on another device" within about 10 seconds (each app checks its session in the background).

**Admin**
- Create, edit, publish, cancel, and delete any event, with a category and poster image (web)
- View and export (CSV) the attendee list of any event (web)
- Check in tickets by scanning QR codes, for events they created (web and mobile)
- Dashboard for all events: charts of tickets reserved per day, seats filled, and attendance, plus totals and revenue (web)
- Manage users: search, filter, and change roles, e.g. make a student an organizer (web)

**Organizer**
- Create, edit, publish, cancel, and delete their own events, with a category and poster image (web)
- View and export (CSV) the attendee list of their own events (web)
- Check in tickets at their events by scanning QR codes (web and mobile)
- Dashboard for their own events (web)

**Student**
- Register, log in, and log out (web and mobile)
- Browse events: search, filter by category, date, and price, and show or hide past events (web and mobile)
- Reserve a ticket with a unique code, e.g. `MSEUF-A8K2PX9Q`, and get a confirmation email (web and mobile)
- Join the waitlist of a sold-out event; when a slot opens, the next student gets a ticket automatically and an email (web and mobile)
- View my tickets with a QR code to show at the entrance; cancel a reserved ticket (web and mobile)
- See whether a ticket was used (checked in) (web and mobile)

**Validation and confirmations**
- Every form checks its fields before submitting and shows errors under each field; the API enforces the same rules.
- Important actions ask for confirmation first: log out, get a ticket, cancel a ticket, join or leave a waitlist, publish, cancel, or delete an event, change a user's role, and leave a form with unsaved changes.

**Ticket rules**
- One active ticket per student per event; capacity is enforced (sold-out protection).
- A ticket can only be checked in once; cancelled tickets are rejected at check-in.
- Only the account that created the event (organizer or admin) can check in its tickets.
- Check-in is open from 2 hours before the event starts until it ends (`Event::CHECK_IN_OPENS_MINUTES_BEFORE`).
- Tickets can't be cancelled after the event starts.
- An event with active tickets must be cancelled before it can be deleted.
- A freed slot (cancellation or higher capacity) goes to the first student on the waitlist.

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | No | Register a student account |
| POST | `/api/login` | No | Log in and get a token |
| POST | `/api/logout` | Yes | Log out (revoke token) |
| GET | `/api/me` | Yes | Current user |
| GET | `/api/categories` | Yes | Event categories |
| GET | `/api/events` | Yes | List events (with category, waitlist count, and whether you're waitlisted) |
| POST | `/api/events` | Yes (admin/organizer) | Create event |
| GET | `/api/events/{id}` | Yes | View event (includes your waitlist position) |
| PUT | `/api/events/{id}` | Yes (owner/admin) | Update event |
| DELETE | `/api/events/{id}` | Yes (owner/admin) | Delete event |
| GET | `/api/events/{id}/poster` | No | Poster image (published events only) |
| POST | `/api/events/{id}/poster` | Yes (owner/admin) | Upload poster (`poster`: JPG/PNG/WebP, max 3 MB, min 300×200) |
| DELETE | `/api/events/{id}/poster` | Yes (owner/admin) | Remove poster |
| GET | `/api/tickets` | Yes | My tickets |
| POST | `/api/events/{id}/tickets` | Yes (student) | Reserve a ticket (emails the ticket) |
| PATCH | `/api/tickets/{id}/cancel` | Yes (owner) | Cancel a ticket |
| POST | `/api/events/{id}/waitlist` | Yes (student) | Join the waitlist of a sold-out event |
| DELETE | `/api/events/{id}/waitlist` | Yes (student) | Leave the waitlist |
| GET | `/api/events/{id}/attendees` | Yes (owner/admin) | Attendee list with check-in summary |
| GET | `/api/events/{id}/attendees/export` | Yes (owner/admin) | Attendee list as a CSV download |
| POST | `/api/check-in` | Yes (owner/admin) | Check in a ticket by its code (`ticket_code`, optional `event_id`) |
| GET | `/api/reports` | Yes (admin/organizer) | Per-event stats, totals, and tickets reserved per day |
| GET | `/api/users` | Yes (admin) | List users (optional `role` and `search` filters) |
| PATCH | `/api/users/{id}/role` | Yes (admin) | Change a user's role |

## Setup

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve --host=0.0.0.0 --port=8000
```

Emails use `MAIL_MAILER=log` by default, so ticket emails are written to `storage/logs/laravel.log` instead of being sent. Set the `MAIL_*` values in `.env` to send real email.

### Web

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173

### Mobile

```bash
cd mobile
npm install
cp .env.example .env
# edit .env and replace YOUR-LAPTOP-IP with your computer's Wi-Fi IPv4 address (run ipconfig)
npx expo start
```

Scan the QR code with Expo Go (SDK 58). The phone and laptop must be on the same Wi-Fi. To preview in a browser instead, press `w` (or run `npx expo start --web`).

## Tests

```bash
cd backend && php artisan test   # API: auth, events, tickets, check-in, waitlist, posters, reports, users
cd web && npm test               # web: validation, login form, events page
```

## Test Accounts

Created by `php artisan migrate:fresh --seed`. All passwords: `password123`

| Role | Email |
|---|---|
| Admin | admin@mseuf.edu.ph |
| Organizer | organizer@mseuf.edu.ph |
| Student | juan@mseuf.edu.ph |
