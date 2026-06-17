<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\WorkSchedule;
use App\Models\User;
use App\Models\Review;

class Business extends Model
{
    protected $table = 'businesses';
    protected $fillable = ['name', 'description', 'address', 'logo_url', 'owner_id', 'latitude', 'longitude'];
    public $timestamps = false;

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function services()
    {
        return $this->hasMany(Service::class);
    }

    public function workSchedules()
    {
        return $this->hasMany(WorkSchedule::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function reviews()
    {
        return $this->hasManyThrough(Review::class, Appointment::class);
    }

    public function staff()
    {
        return $this->belongsToMany(User::class, 'business_staff', 'business_id', 'user_id');
    }
}
