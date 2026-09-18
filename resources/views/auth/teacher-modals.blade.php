<!-- Teacher Login QR Scanner Modal -->
<div
    id="teacher-qr-modal"
    class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
>
    <div
        class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-scale-up"
    >
        <div class="flex justify-between items-center mb-6">
            <div>
                <h3 class="text-xl font-bold text-gray-800">
                    Scan Login Badge
                </h3>
                <p class="text-xs text-gray-400 mt-1">Hold your designated QR code up to the camera.</p>
            </div>
            <button
                onclick="
                    document
                        .getElementById('teacher-qr-modal')
                        .classList.add('hidden');
                    stopTeacherCamera();
                "
                class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition text-sm"
            >
                <i class="ph ph-x"></i>
            </button>
        </div>

        <div
            id="t-scan-error"
            class="hidden mb-4 py-2 px-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-lg text-center"
        ></div>

        <div
            class="w-full rounded-2xl bg-gray-950 overflow-hidden relative shadow-inner ring-4 ring-gray-100"
            style="aspect-ratio: 1/1; min-height: 240px"
        >
            <div id="t-qr-reader" class="hidden w-full h-full"></div>

            <!-- SCANNING ANIMATION LAYER -->
            <div
                id="t-scan-overlay"
                class="hidden absolute inset-0 pointer-events-none z-20"
            >
                <div
                    class="absolute inset-x-8 top-1/2 -translate-y-1/2 bottom-1/2 border-2 border-emerald-500/50 rounded-xl"
                ></div>
                <!-- LASER LINE -->
                <div
                    class="absolute inset-x-4 h-0.5 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-scan-line z-30"
                ></div>
                <!-- PULSING DOTS -->
                <div
                    class="absolute top-4 left-4 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"
                ></div>
                <div
                    class="absolute top-4 right-4 w-2 h-2 bg-emerald-500 rounded-full animate-pulse delay-75"
                ></div>
            </div>

            <div
                id="t-qr-loading"
                class="hidden absolute inset-0 flex items-center justify-center bg-black/50 z-40 backdrop-blur-sm"
            >
                <div class="flex flex-col items-center gap-3">
                    <div
                        class="animate-spin rounded-full h-10 w-10 border-4 border-white/20 border-t-white"
                    ></div>
                    <span
                        class="text-white text-[10px] font-black uppercase tracking-widest"
                        >Processing...</span
                    >
                </div>
            </div>
            <div
                id="t-qr-entry-zone"
                class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white z-10"
            >
                <div
                    class="relative w-32 h-32 border-4 border-white/20 rounded-3xl flex items-center justify-center bg-white/5 backdrop-blur-sm shadow-xl"
                >
                    <i class="ph ph-qr-code text-6xl text-white/30"></i>
                </div>
                <div class="text-center">
                    <p class="text-xs font-bold text-white tracking-wide">Scanner Ready</p>
                    <p class="text-[10px] text-white/50 mt-1 uppercase tracking-tighter">Facing Camera Environment</p>
                </div>
            </div>
        </div>

        <input
            type="file"
            id="t-qr-input"
            accept="image/*"
            class="hidden"
            onchange="handleTeacherQrImage(this)"
        />

        <div id="t-stop-scan-btn" class="hidden mt-4">
            <button
                onclick="stopTeacherCamera()"
                class="w-full py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition flex items-center justify-center gap-2"
            >
                <i class="ph ph-stop-circle"></i> Stop Camera
            </button>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3">
            <button
                onclick="startTeacherCamera()"
                class="col-span-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:opacity-90 transition flex items-center justify-center gap-2 shadow-md"
            >
                <i class="ph ph-camera"></i> Use Camera
            </button>
            <button
                onclick="document.getElementById('t-qr-input').click()"
                class="col-span-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2"
            >
                <i class="ph ph-image"></i> Upload Image
            </button>
        </div>
    </div>
</div>

<!-- Teacher QR PIN Verify Modal -->
<div
    id="teacher-qr-pin-verify-modal"
    class="hidden fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
>
    <div
        class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-scale-up text-center relative overflow-hidden"
    >
        <div
            class="absolute -top-10 -right-10 w-40 h-40 bg-brand-blue/5 rounded-full blur-3xl pointer-events-none"
        ></div>

        <img
            id="t-pin-verify-avatar"
            src=""
            class="w-20 h-20 rounded-2xl mx-auto shadow-md border-4 border-white object-cover mb-4"
        />

        <h3
            class="text-xl font-bold text-gray-800 tracking-tight"
            id="t-pin-verify-name"
        >
            Teacher Name
        </h3>
        <p class="text-xs text-gray-400 mt-1 mb-6 font-medium uppercase tracking-wider">Enter 6-Digit PIN to Continue</p>

        <div class="space-y-4 relative z-10">
            <input
                type="password"
                id="t-verify-pin-input"
                maxlength="6"
                inputmode="numeric"
                placeholder="------"
                class="w-full text-center text-3xl font-mono tracking-[0.5em] font-black border border-gray-200 rounded-xl px-4 py-4 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue text-gray-700 transition"
            />
            <p id="t-verify-pin-error" class="text-xs font-bold text-red-500 hidden"></p>

            <div class="flex gap-3 mt-2">
                <button
                    onclick="
                        document
                            .getElementById('teacher-qr-pin-verify-modal')
                            .classList.add('hidden');
                        document
                            .getElementById('teacher-qr-modal')
                            .classList.remove('hidden');
                    "
                    class="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm"
                >
                    Cancel
                </button>
                <button
                    onclick="verifyTeacherQrPinSubmit()"
                    id="t-verify-pin-btn"
                    class="flex-1 py-3.5 bg-brand-blue hover:opacity-90 text-white font-bold rounded-xl transition shadow-md text-sm cursor-pointer"
                >
                    Unlock
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Student QR Modal -->
<div
    id="qr-scan-modal"
    class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
>
    <div
        class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-scale-up"
    >
        <div class="flex justify-between items-center mb-6">
            <div>
                <h3 class="text-xl font-bold text-gray-800">Scan Student QR</h3>
                <p class="text-xs text-gray-400 mt-1">View academic grades instantly</p>
            </div>
            <button
                onclick="
                    document
                        .getElementById('qr-scan-modal')
                        .classList.add('hidden');
                    stopCameraScanner();
                "
                class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition text-sm"
            >
                <i class="ph ph-x"></i>
            </button>
        </div>
        <div
            class="w-full rounded-2xl bg-gray-950 overflow-hidden relative shadow-inner ring-4 ring-gray-100"
            style="aspect-ratio: 1/1; min-height: 240px"
        >
            <div id="qr-reader" class="hidden w-full h-full"></div>

            <!-- SCANNING ANIMATION LAYER -->
            <div
                id="qr-scan-overlay"
                class="hidden absolute inset-0 pointer-events-none z-20"
            >
                <div
                    class="absolute inset-x-8 top-1/2 -translate-y-1/2 bottom-1/2 border-2 border-emerald-500/50 rounded-xl"
                ></div>
                <!-- LASER LINE -->
                <div
                    class="absolute inset-x-4 h-0.5 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-scan-line z-30"
                ></div>
                <!-- PULSING DOTS -->
                <div
                    class="absolute top-4 left-4 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"
                ></div>
                <div
                    class="absolute top-4 right-4 w-2 h-2 bg-emerald-500 rounded-full animate-pulse delay-75"
                ></div>
            </div>

            <div
                id="qr-loading"
                class="hidden absolute inset-0 flex items-center justify-center bg-black/50 z-40 backdrop-blur-sm"
            >
                <div class="flex flex-col items-center gap-3">
                    <div
                        class="animate-spin rounded-full h-10 w-10 border-4 border-white/20 border-t-white"
                    ></div>
                    <span
                        class="text-white text-[10px] font-black uppercase tracking-widest"
                        >Processing...</span
                    >
                </div>
            </div>
            <div
                id="qr-entry-zone"
                class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white z-10"
            >
                <div
                    class="relative w-32 h-32 border-4 border-white/20 rounded-3xl flex items-center justify-center bg-white/5 backdrop-blur-sm shadow-xl"
                >
                    <i class="ph ph-qr-code text-6xl text-white/30"></i>
                </div>
                <div class="text-center">
                    <p class="text-xs font-bold text-white tracking-wide">Scanner Ready</p>
                    <p class="text-[10px] text-white/50 mt-1 uppercase tracking-tighter">Facing Camera Environment</p>
                </div>
            </div>
        </div>
        <input
            type="file"
            id="qr-input"
            accept="image/*"
            class="hidden"
            onchange="handleQrScan(this)"
        />
        <div id="stop-scan-btn" class="hidden mt-4">
            <button
                onclick="stopCameraScanner()"
                class="w-full py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition flex items-center justify-center gap-2"
            >
                <i class="ph ph-stop-circle"></i> Stop Camera
            </button>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3">
            <button
                onclick="startCameraScanner()"
                class="col-span-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:opacity-90 transition flex items-center justify-center gap-2 shadow-md"
            >
                <i class="ph ph-camera"></i> Use Camera
            </button>
            <button
                onclick="document.getElementById('qr-input').click()"
                class="col-span-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2"
            >
                <i class="ph ph-image"></i> Upload Image
            </button>
        </div>
    </div>
</div>
<script>
    let teacherScanner;

    function startTeacherCamera() {
        // UI reset
        document.getElementById("t-qr-entry-zone").classList.add("hidden");
        document.getElementById("t-qr-reader").classList.remove("hidden");
        document.getElementById("t-stop-scan-btn").classList.remove("hidden");
        document.getElementById("t-scan-error").classList.add("hidden");

        // Delay initialization slightly to ensure element has dimensions
        setTimeout(() => {
            if (teacherScanner) {
                teacherScanner
                    .stop()
                    .catch(() => {})
                    .finally(() => {
                        initScanner();
                    });
            } else {
                initScanner();
            }
        }, 100);

        function initScanner() {
            document
                .getElementById("t-scan-overlay")
                .classList.remove("hidden");
            teacherScanner = new Html5Qrcode("t-qr-reader");
            teacherScanner
                .start(
                    { facingMode: "environment" },
                    { fps: 15, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        stopTeacherCamera();
                        handleTeacherQrScanned(decodedText);
                    },
                    (errorMessage) => {},
                )
                .catch((err) => {
                    console.error("Camera Start Error:", err);
                    document.getElementById("t-scan-error").innerText =
                        "Camera error: " + (err.message || "Access denied");
                    document
                        .getElementById("t-scan-error")
                        .classList.remove("hidden");
                    stopTeacherCamera();
                });
        }
    }

    function stopTeacherCamera() {
        if (teacherScanner) {
            teacherScanner
                .stop()
                .then(() => {
                    teacherScanner.clear();
                    teacherScanner = null;
                })
                .catch((err) => console.error(err));
        }
        document.getElementById("t-qr-reader").classList.add("hidden");
        document.getElementById("t-scan-overlay").classList.add("hidden");
        document.getElementById("t-qr-entry-zone").classList.remove("hidden");
        document.getElementById("t-stop-scan-btn").classList.add("hidden");
    }

    function handleTeacherQrImage(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            document.getElementById("t-qr-loading").classList.remove("hidden");

            const fileScanner = new Html5Qrcode("t-qr-reader");
            fileScanner
                .scanFile(file, true)
                .then((decodedText) => {
                    document
                        .getElementById("t-qr-loading")
                        .classList.add("hidden");
                    handleTeacherQrScanned(decodedText);
                })
                .catch((err) => {
                    document
                        .getElementById("t-qr-loading")
                        .classList.add("hidden");
                    document.getElementById("t-scan-error").innerText =
                        "No QR code found in image.";
                    document
                        .getElementById("t-scan-error")
                        .classList.remove("hidden");
                });
            input.value = "";
        }
    }

    async function handleTeacherQrScanned(id) {
        document.getElementById("teacher-qr-modal").classList.add("hidden");
        try {
            const res = await fetch("/api/teachers/login-by-id", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({ teacher_id: id }),
            });
            const data = await res.json();

            if (data.requires_pin) {
                document.getElementById("t-pin-verify-name").innerText =
                    data.name;
                document.getElementById("t-pin-verify-avatar").src =
                    data.profile_picture ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=1e3a8a&color=fff`;
                document.getElementById(
                    "teacher-qr-pin-verify-modal",
                ).dataset.teacherId = data.teacher_id;
                document
                    .getElementById("teacher-qr-pin-verify-modal")
                    .classList.remove("hidden");
                document.getElementById("t-verify-pin-input").focus();
            } else if (res.ok) {
                completeTeacherLogin(data);
            } else {
                alert(data.error || "Login failed");
            }
        } catch (e) {
            alert("Network error");
        }
    }

    async function verifyTeacherQrPinSubmit() {
        const pin = document.getElementById("t-verify-pin-input").value;
        const id = document.getElementById("teacher-qr-pin-verify-modal")
            .dataset.teacherId;
        const err = document.getElementById("t-verify-pin-error");

        if (pin.length !== 6) return;

        err.classList.add("hidden");
        try {
            const res = await fetch("/api/teachers/verify-qr-pin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({ teacher_id: id, pin: pin }),
            });
            const data = await res.json();
            if (res.ok) {
                completeTeacherLogin(data);
            } else {
                err.innerText = data.error;
                err.classList.remove("hidden");
            }
        } catch (e) {
            err.innerText = "Network error";
            err.classList.remove("hidden");
        }
    }

    function completeTeacherLogin(teacher) {
        // Mocking the navigation and session storage for brevity, but should match app.js logic
        sessionStorage.setItem(
            "cnhs_session",
            JSON.stringify({
                role: "teacher",
                name: teacher.name,
                id: teacher.id,
                db_id: teacher.db_id,
                subject: teacher.subject,
                isAdviser: teacher.is_adviser,
                section: teacher.section,
                profile_picture: teacher.profile_picture,
            }),
        );
        window.location.href = "/teacher/dashboard";
    }
</script>

<style>
    @keyframes scanLineMove {
        0% {
            top: 10%;
        }
        100% {
            top: 90%;
        }
    }
    .animate-scan-line {
        animation: scanLineMove 2s ease-in-out infinite alternate;
    }
</style>
