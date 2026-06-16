<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AddressCache extends Model
{
    protected $table = 'address_cache';
    protected $fillable = ['address', 'latitude', 'longitude'];
    public $timestamps = false;
}
