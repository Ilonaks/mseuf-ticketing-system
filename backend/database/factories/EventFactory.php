<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startAt = now()->addDays(fake()->numberBetween(3, 30))->setTime(9, 0);

        return [
            'user_id' => User::factory()->organizer(),
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'venue' => fake()->randomElement(['MSEUF Gymnasium', 'Audio-Visual Room', 'University Grounds']),
            'start_at' => $startAt,
            'end_at' => $startAt->copy()->addHours(3),
            'capacity' => 100,
            'price' => 0,
            'status' => 'published',
        ];
    }

    /**
     * Indicate that the event is happening right now (check-in is open).
     */
    public function happeningNow(): static
    {
        return $this->state(fn (array $attributes) => [
            'start_at' => now()->subMinutes(30),
            'end_at' => now()->addHours(2),
        ]);
    }

    /**
     * Indicate that the event is still a draft.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'draft',
        ]);
    }
}
