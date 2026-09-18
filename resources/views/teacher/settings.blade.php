{{-- resources/views/teacher/settings.blade.php --}}
@extends ('dash.main')

@section ('content')
    <div id="settings-container"></div>
    <!-- Teacher QR PIN Modal -->
    <div
        id="teacher-qr-pin-modal"
        class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-scale-up text-center relative overflow-hidden"
        >
            <h3 class="text-xl font-bold text-gray-800 tracking-tight">
                Security PIN
            </h3>
            <p class="text-xs text-gray-400 mt-1 mb-6 font-medium uppercase tracking-wider">Protect your Login QR Code</p>

            <div class="space-y-4">
                <input
                    type="password"
                    id="teacher-qr-pin-input"
                    maxlength="6"
                    inputmode="numeric"
                    placeholder="------"
                    class="w-full text-center text-3xl font-mono tracking-[0.5em] font-black border border-gray-200 rounded-xl px-4 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-700 transition"
                />
                <p id="teacher-qr-pin-error" class="text-xs font-bold text-red-500 hidden"></p>
                <p class="text-[10px] text-gray-400 font-medium">Create a 6-digit numeric PIN. If you forget this PIN, you will need to re-login with your username to reset it.</p>

                <div class="flex gap-3 mt-4">
                    <button
                        onclick="closeTeacherQrPinModal()"
                        class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onclick="saveTeacherQrPin()"
                        id="teacher-save-pin-btn"
                        class="flex-1 py-3 bg-primary hover:bg-primaryDark text-white font-bold rounded-xl transition shadow-md shadow-primary/20 text-sm flex justify-center items-center"
                    >
                        Secure QR Code
                    </button>
                </div>
            </div>
        </div>
    </div>
@endsection
