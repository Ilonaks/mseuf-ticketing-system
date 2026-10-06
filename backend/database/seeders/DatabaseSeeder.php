<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'System Admin',
            'email' => 'admin@mseuf.edu.ph',
            'password' => 'password123',
            'role' => 'admin',
        ]);

        $organizer = User::create([
            'name' => 'Student Council',
            'email' => 'organizer@mseuf.edu.ph',
            'password' => 'password123',
            'role' => 'organizer',
        ]);

        User::create([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@mseuf.edu.ph',
            'password' => 'password123',
            'role' => 'student',
            'student_id' => '2023-00001',
        ]);

        $organizer->events()->createMany([
            [
                'title' => 'Foundation Week Concert',
                'description' => 'Annual concert celebrating the university foundation week.',
                'venue' => 'MSEUF Gymnasium',
                'start_at' => now()->addDays(10)->setTime(18, 0),
                'end_at' => now()->addDays(10)->setTime(22, 0),
                'capacity' => 500,
                'price' => 150,
                'status' => 'published',
            ],
            [
                'title' => 'IT Days: Tech Talk',
                'description' => 'Talks and workshops for IT and CS students.',
                'venue' => 'Audio-Visual Room',
                'start_at' => now()->addDays(14)->setTime(8, 0),
                'end_at' => now()->addDays(14)->setTime(12, 0),
                'capacity' => 120,
                'price' => 0,
                'status' => 'published',
            ],
            [
                'title' => 'Intramurals Opening Ceremony',
                'description' => 'Draft event, not yet visible to students.',
                'venue' => 'University Grounds',
                'start_at' => now()->addDays(20)->setTime(7, 0),
                'end_at' => now()->addDays(20)->setTime(11, 0),
                'capacity' => 1000,
                'price' => 0,
                'status' => 'draft',
            ],
        ]);
    }
}