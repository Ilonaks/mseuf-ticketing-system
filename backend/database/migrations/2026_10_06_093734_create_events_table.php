<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // organizer
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('venue');
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->unsignedInteger('capacity');
            $table->decimal('price', 8, 2)->default(0); // 0 = free
            $table->string('status')->default('draft'); // draft, published, cancelled
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};