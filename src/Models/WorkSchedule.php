<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Business;

class WorkSchedule extends Model
{
    protected $table = 'work_schedules';
    protected $fillable = ['business_id', 'day_of_week', 'start_time', 'end_time'];
    public $timestamps = false;

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
