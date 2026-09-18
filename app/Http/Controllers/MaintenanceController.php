<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use App\Models\Setting;

class MaintenanceController extends Controller
{
    /**
     * Get All Settings
     */
    public function getSettings()
    {
        $settings = Setting::all()->pluck('value', 'key');
        return response()->json(['settings' => $settings]);
    }

    /**
     * Save Settings
     */
    public function saveSettings(Request $request)
    {
        $data = $request->all();

        foreach ($data as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => is_array($value) ? json_encode($value) : $value]
            );
        }

        return response()->json(['success' => true, 'message' => 'Settings saved successfully!']);
    }

    /**
     * Upload System Logo
     */
    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|string'
        ]);

        try {
            $base64 = $request->input('logo');
            
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
                $base64 = substr($base64, strpos($base64, ',') + 1);
                $type = strtolower($type[1]); // jpg, png, gif

                if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png', 'webp'])) {
                    return response()->json(['error' => 'invalid image type'], 400);
                }
                
                $data = base64_decode($base64);

                if ($data === false) {
                    return response()->json(['error' => 'base64 decode failed'], 400);
                }
            } else {
                return response()->json(['error' => 'did not match data URI with image data'], 400);
            }

            // Save the logo to public/img/logo.png
            $path = public_path('img/logo.png');
            File::put($path, $data);

            return response()->json(['success' => true, 'message' => 'Logo updated successfully!']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Upload Login Background
     */
    public function uploadLoginBackground(Request $request)
    {
        $request->validate([
            'background' => 'required|string'
        ]);

        try {
            $base64 = $request->input('background');
            
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
                $base64 = substr($base64, strpos($base64, ',') + 1);
                $type = strtolower($type[1]); 

                if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png', 'webp'])) {
                    return response()->json(['error' => 'invalid image type'], 400);
                }
                
                $data = base64_decode($base64);

                if ($data === false) {
                    return response()->json(['error' => 'base64 decode failed'], 400);
                }
            } else {
                return response()->json(['error' => 'did not match data URI with image data'], 400);
            }

            // First time: backup existing background if not already backed up
            $defaultPath = public_path('img/school_default.png');
            $currentPath = public_path('img/school.png');
            
            if (!File::exists($defaultPath) && File::exists($currentPath)) {
                File::copy($currentPath, $defaultPath);
            }

            // Save new background
            File::put($currentPath, $data);

            return response()->json(['success' => true, 'message' => 'Login Background updated successfully!']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Restore Default Login Background
     */
    public function restoreDefaultBackground(Request $request)
    {
        try {
            $defaultPath = public_path('img/school_default.png');
            $currentPath = public_path('img/school.png');

            if (File::exists($defaultPath)) {
                File::copy($defaultPath, $currentPath);
                return response()->json(['success' => true, 'message' => 'Default Background restored successfully!']);
            } else {
                return response()->json(['error' => 'Default background backup not found.'], 404);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
