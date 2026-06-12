<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Appointment;

class Review extends Model
{
    protected $table = 'reviews';
    protected $fillable = ['appointment_id', 'rating', 'comment'];
    public $timestamps = false; // El campo created_at se maneja por defecto en la BD

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }
}
