# MSEUF Events Ticketing System

A combined web and mobile ticketing system for Manuel S. Enverga University Foundation (MSEUF) events. Built with the MVC pattern for the midterm exam.

**Status:** 50% (midterm milestone)

## Tech Stack

| Layer | Technology |
|---|---|
| Backend (Model + Controller) | PHP, Laravel, Laravel Sanctum (API token auth) |
| Database | SQLite |
| Web frontend (View) | React + Vite (JavaScript) |
| Mobile frontend (View) | React Native + Expo |
| Dev environment | Laravel Herd, Node.js |

## Project Structure

```
mseuf-ticketing-system/
├── backend/   Laravel API (models, migrations, controllers, policies)
├── web/       React + Vite web app
└── mobile/    React Native + Expo mobile app
```

## MVC Overview

- **Model:** `backend/app/Models` (User, Event, Ticket) with Eloquent relationships
- **Controller:** `backend/app/Http/Controllers` (AuthController, EventController, TicketController)
- **View:** the React web app and the Expo mobile app, which consume the same JSON API
- **Authorization:** `backend/app/Policies/EventPolicy.php` (role-based permissions)

## Features Completed (50%)

**Authentication (Sanctum)**
- Register (students), login, logout, current user

**Roles**
- Admin: manage all events
- Organizer: create events, manage own events
- Student: view published events, reserve tickets

**Events**
- Full CRUD API with role-based permissions
- Students only see published events; drafts are hidden

**Tickets**
- Reserve a ticket with a unique code (e.g. `MSEUF-A8K2PX9Q`)
- One active ticket per student per event
- Capacity check (sold out protection)
- View and cancel own tickets

**Web app:** login, register, events list with Get Ticket, My Tickets
**Mobile app:** login, events list with Get Ticket, pull-to-refresh, logout

## Planned for Final (remaining 50%)

- Organizer/admin screens for creating and editing events
- QR codes for tickets and check-in scanning
- My Tickets and registration on mobile
- Reports and dashboard

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | No | Register a student account |
| POST | `/api/login` | No | Log in and get a token |
| POST | `/api/logout` | Yes | Log out (revoke token) |
| GET | `/api/me` | Yes | Current user |
| GET | `/api/events` | Yes | List events |
| POST | `/api/events` | Yes (admin/organizer) | Create event |
| GET | `/api/events/{id}` | Yes | View event |
| PUT | `/api/events/{id}` | Yes (owner/admin) | Update event |
| DELETE | `/api/events/{id}` | Yes (owner/admin) | Delete event |
| GET | `/api/tickets` | Yes | My tickets |
| POST | `/api/events/{id}/tickets` | Yes (student) | Reserve a ticket |
| PATCH | `/api/tickets/{id}/cancel` | Yes (owner) | Cancel a ticket |

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
npx expo login
npx expo start
```

Scan the QR code with Expo Go. The phone and laptop must be on the same Wi-Fi.

## Test Accounts

Created by `php artisan migrate:fresh --seed`. All passwords: `password123`

| Role | Email |
|---|---|
| Admin | admin@mseuf.edu.ph |
| Organizer | organizer@mseuf.edu.ph |
| Student | juan@mseuf.edu.ph |