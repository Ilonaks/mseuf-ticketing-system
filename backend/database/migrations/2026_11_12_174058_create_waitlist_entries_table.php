<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('waitlist_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // student waiting
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->timestamps(); // created_at decides the order (first come, first served)

            $table->unique(['user_id', 'event_id']); // one spot per student per event
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waitlist_entries');
    }
};
