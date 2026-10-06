<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // student
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('ticket_code')->unique();
            $table->string('status')->default('reserved'); // reserved, used, cancelled
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'event_id']); // one ticket per student per event
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};