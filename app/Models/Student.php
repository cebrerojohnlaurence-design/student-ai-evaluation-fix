<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\StudentSubject;


/**
 * @property int $id
 * @property string $lrn
 * @property string $name
 * @property string|null $section
 * @property string|null $adviser
 * @property float|null $attendance
 * @property string $status
 * @property float|null $gwa
 * @property string|null $risk
 * @property array|null $enrollment_history
 * @property string|null $password
 * @property string|null $plain_password
 * @property string|null $qr_pin
 * @property string|null $profile_picture
 * @property string|null $address
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
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
        'department',
        'strand',
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
