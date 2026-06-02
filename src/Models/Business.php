<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\WorkSchedule;
use App\Models\User;

class Business extends Model
{
    protected $table = 'businesses';
    protected $fillable = ['name', 'description', 'address', 'logo_url', 'owner_id'];
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
}
