<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Appointment;
use App\Models\Business;

class Service extends Model
{
    protected $table = 'services';
    protected $fillable = ['business_id', 'name', 'description', 'duration_minutes', 'price'];
    public $timestamps = false;

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }
}
