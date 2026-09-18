<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ActivityLog;

class ActivityLogController extends Controller
{
    public function index()
    {
        $logs = ActivityLog::orderBy('created_at', 'desc')->limit(500)->get();
        return response()->json($logs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'action' => 'required|string',
            'user' => 'nullable|string'
        ]);

        $log = ActivityLog::create([
            'user_name' => $validated['user'] ?? 'System',
            'action' => $validated['action'],
        ]);

        return response()->json(['success' => true, 'log' => $log]);
    }
}
