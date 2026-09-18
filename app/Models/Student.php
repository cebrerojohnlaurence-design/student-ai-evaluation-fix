<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\StudentSubject;


class Student extends Model
{
    protected $fillable = [
        'lrn',
        'name',
        'section',
        'adviser',
        'attendance',
        'status',
        'gwa',
        'risk',
        'enrollment_history',
        'password',
        'plain_password',
        'qr_pin',
        'profile_picture',
        'address',
    ];

    protected $hidden = ['password', 'qr_pin'];

    protected $casts = [
        'attendance' => 'float',
        'gwa'        => 'float',
        'enrollment_history' => 'array',
    ];

    public function subjects()
    {
        return $this->hasMany(StudentSubject::class);
    }

    public function attendances()
    {
        return $this->hasMany(StudentAttendance::class);
    }
}
