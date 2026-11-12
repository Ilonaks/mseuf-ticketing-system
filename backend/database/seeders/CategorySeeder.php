<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Event categories with chip colors. Safe to run more than once.
     */
    public function run(): void
    {
        $categories = [
            'Academic' => '#2851a3',
            'Sports' => '#1e7b3c',
            'Cultural' => '#9a3412',
            'Social' => '#7a1f2b',
            'Tech' => '#5b21b6',
            'Career' => '#0f766e',
        ];

        foreach ($categories as $name => $color) {
            Category::updateOrCreate(['name' => $name], ['color' => $color]);
        }
    }
}
