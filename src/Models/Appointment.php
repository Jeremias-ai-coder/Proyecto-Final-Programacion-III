<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Business;
use App\Models\Service;
use App\Models\User;

class Appointment extends Model
{
    protected $table = 'appointments';
    protected $fillable = ['business_id', 'service_id', 'user_id', 'date', 'time', 'status'];
    public $timestamps = true;

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function review()
    {
        return $this->hasOne(Review::class);
    }
}
