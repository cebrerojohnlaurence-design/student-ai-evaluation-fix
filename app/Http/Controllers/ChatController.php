<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    /**
     * Handle chat requests using Google Gemini API directly
     */
    public function chat(Request $request)
    {
        $message = $request->input('message');
        
        $apiKey = env('GEMINI_API_KEY');
        if (!$apiKey) {
            return response()->json(['error' => 'Google Gemini API Key is not configured in .env'], 500);
        }

        // Hit the Google Gemini 2.5 flash model directly
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' . $apiKey;
        
        $response = Http::post($url, [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $message]
                    ]
                ]
            ]
        ]);

        if ($response->successful()) {
            $data = $response->json();
            $reply = $data['candidates'][0]['content']['parts'][0]['text'] ?? 'No meaningful insight was returned by the AI.';
            
            // Clean up Markdown if returned (since frontend renders directly in HTML sometimes)
            $reply = str_replace('**', '', $reply); 
            $reply = trim($reply);

            return response()->json(['reply' => $reply]);
        } else {
            return response()->json(['error' => 'Gemini API Error: ' . $response->body()], 500);
        }
    }
}
