<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Student Portal - Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
    />

    <style>
        body {
            font-family: "Inter", sans-serif;
            background-color: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .page-bg {
            position: fixed;
            inset: 0;
            background-image: url("{{ asset('img/background.jpg') }}");
            background-size: cover;
            background-position: center;
            filter: blur(12px) brightness(0.6);
            transform: scale(1.1);
            z-index: -1;
        }

        .page-overlay {
            position: fixed;
            inset: 0;
            background: radial-gradient(
                circle at center,
                transparent 0%,
                rgba(0, 0, 0, 0.4) 100%
            );
            z-index: -1;
        }

        .logo-seal {
            background:
                radial-gradient(circle, #60a5fa 40%, transparent 41%),
                radial-gradient(circle, #fcd34d 50%, transparent 51%);
        }

        .logo-outer-gear {
            border: 4px dashed #b91c1c;
            border-radius: 50%;
        }
        @keyframes
        twinkle {
            0%,
            100% {
                opacity: 1;
                transform: scale(1);
            }
            50% {
                opacity: 0.5;
                transform: scale(0.8);
            }
        }
        .sparkle {
            animation: twinkle 3s ease-in-out infinite;
        }
        .bg-school-gate {
            background-image: url("{{ asset('img/school.png') }}");
            background-size: cover;
            background-position: 5% 10%;
        }
        .btn-school-primary {
            background-color: #1e3a8a; /* School Blue */
        }
        .btn-school-primary:hover {
            background-color: #172554;
        }
        .text-school-accent {
            color: #b91c1c; /* School Red */
        }
        .border-school-accent {
            border-color: #fcd34d; /* School Gold */
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center antialiased">
    <div class="page-bg"></div>
    <div class="page-overlay"></div>

    <div
        class="relative w-[95%] max-w-5xl h-[650px] bg-white flex flex-col md:flex-row shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden rounded-[30px] border-none"
    >
        {{-- Right panel: school photo as img for precise object-position control --}}
        <div
            class="hidden md:block absolute right-0 top-0 w-[65%] h-full z-0 overflow-hidden"
        >
            <img
                src="{{ asset('img/school.png') }}"
                class="w-full h-full object-cover"
                style="object-position: 12% 10%"
                alt="Can-avid National High School"
            />
            <div class="absolute inset-0 bg-black/10"></div>
        </div>

        <!-- S-CURVE SEPARATOR -->
        <svg class="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0,0 L 55,0 C 40,25 75,75 45,100 L 0,100 Z" fill="#ffffff" />
        </svg>

        <!-- LEFT SIDE: LOGIN FORM -->
        <div
            class="relative z-20 w-full md:w-1/2 h-full flex flex-col justify-center py-6 px-8 sm:px-12 md:px-16 lg:px-24 bg-white md:bg-transparent"
        >
            <div class="flex flex-col items-center mb-3 text-center">
                <div
                    class="relative w-20 h-20 mb-2 flex items-center justify-center logo-outer-gear"
                >
                    <div
                        class="absolute inset-1 rounded-full overflow-hidden bg-white shadow-inner flex items-center justify-center"
                    >
                        <img
                            src="{{ asset('img/logo.png') }}"
                            class="w-14 h-14"
                        />
                    </div>
                </div>

                <h2
                    id="portal-label"
                    class="text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-3"
                >
                    Student Portal
                </h2>
                <h1
                    id="login-title"
                    class="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2 flex flex-col gap-1"
                >
                    <span class="text-slate-800">Welcome</span>
                    <span class="text-[#b91c1c]">Student</span>
                </h1>
                <p class="text-xs text-gray-400 font-medium max-w-[280px]">Access your academic grades and activities dashboard instantly</p>
            </div>

            <div class="w-full flex flex-col gap-3">
                <div
                    class="relative bg-[#f1f4f9] rounded-[18px] overflow-hidden focus-within:ring-2 focus-within:ring-[#1b4332]/20 transition-all border border-transparent"
                >
                    <label
                        class="absolute left-5 top-3 text-[9px] font-black text-gray-400 uppercase tracking-widest z-10"
                        >Student LRN</label
                    >
                    <input
                        type="text"
                        id="login-user"
                        placeholder="Enter LRN"
                        class="w-full bg-transparent pt-6 pb-2 px-5 outline-none text-sm font-bold text-slate-700 relative z-20 transition-all"
                    />
                </div>

                <button
                    id="login-btn"
                    onclick="executeStudentLogin()"
                    class="w-full btn-school-primary text-white font-black tracking-[0.25em] rounded-[18px] mt-2 transition-all shadow-xl shadow-blue-900/30 active:scale-[0.98] text-[13px] uppercase"
                    style="padding: 18px 0"
                >
                    LOGIN AS STUDENT
                </button>
            </div>

            <div class="w-full flex flex-col gap-2 mt-4 text-center">
                <p class="text-[10px] text-gray-400 font-black tracking-[0.2em] uppercase mb-1 opacity-60">Or scan your ID badge</p>
                <button
                    onclick="
                        document
                            .getElementById('qr-scan-modal')
                            .classList.remove('hidden')
                    "
                    class="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-full py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white hover:border-emerald-200 hover:text-emerald-600 transition-all bg-white/40 backdrop-blur-md shadow-sm group"
                >
                    <i
                        class="ph ph-qr-code text-xl group-hover:scale-110 transition-transform"
                    ></i>
                    QUICK SCAN VIEW
                </button>
            </div>
        </div>

        <!-- DECORATIVE SPARKLES -->
        <svg class="hidden md:block absolute z-30 w-6 h-6 text-pink-400 sparkle top-[22%] left-[48%]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" /></svg>
        <svg class="hidden md:block absolute z-30 w-4 h-4 text-teal-400 sparkle top-[18%] left-[54%]" viewBox="0 0 24 24" fill="currentColor" style="animation-delay: 0.5s;"><path d="M12 2L22 12L12 22L2 12L12 2Z" /></svg>
        <svg class="hidden md:block absolute z-30 w-4 h-4 text-pink-300 sparkle top-[42%] left-[52%]" viewBox="0 0 24 24" fill="currentColor" style="animation-delay: 1s;"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" /></svg>
        <svg class="hidden md:block absolute z-30 w-5 h-5 text-yellow-400 sparkle top-[62%] left-[49%]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="animation-delay: 0.2s;"><path d="M12 2V22M2 12H22" /></svg>
        <div
            class="hidden md:block absolute z-30 w-2 h-2 rounded-full bg-teal-400 sparkle top-[75%] left-[51%]"
            style="animation-delay: 0.8s"
        ></div>
    </div>

    <!-- STUDENT PIN VERIFICATION MODAL -->
    <div
        id="student-pin-modal"
        class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
        <div
            class="relative bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl transform transition-all border border-gray-100"
        >
            <div class="p-8 flex flex-col items-center">
                <div
                    class="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6"
                >
                    <i class="ph ph-shield-check text-4xl text-blue-600"></i>
                </div>

                <h3 class="text-xl font-black text-gray-900 mb-2">
                    Security Verification
                </h3>
                <p class="text-sm text-gray-400 text-center mb-8">Please enter your 6-digit security PIN to continue</p>

                <div
                    class="w-full flex justify-between gap-2 mb-8"
                    id="s-pin-inputs"
                >
                    @for ($i = 0; $i < 6; $i++)
                        <input
                            type="password"
                            maxlength="1"
                            class="w-11 h-14 bg-gray-50 border-2 border-transparent rounded-2xl text-center text-xl font-bold text-blue-600 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm s-pin-digit"
                            pattern="[0-9]*"
                            inputmode="numeric"
                        />
                    @endfor
                </div>

                <div
                    id="s-pin-error"
                    class="hidden w-full mb-6 p-3 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3"
                >
                    <i class="ph ph-warning-circle text-red-500 text-lg"></i>
                    <span
                        class="text-[10px] font-black uppercase tracking-wider text-red-600"
                        >Incorrect PIN code</span
                    >
                </div>

                <button
                    onclick="submitStudentPin()"
                    id="s-pin-submit-btn"
                    class="w-full py-4 bg-blue-600 text-white rounded-[18px] font-black tracking-[0.2em] text-xs uppercase shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                    VERIFY & LOGIN
                </button>

                <button
                    onclick="closeStudentPinModal()"
                    class="mt-6 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                >
                    Cancel Request
                </button>
            </div>
        </div>
    </div>

    @include ('auth.teacher-modals')

    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script src="https://unpkg.com/html5-qrcode"></script>
    <script src="{{ asset('js/subjectCatalog.js') }}"></script>
    <script src="{{ asset('js/app.js') }}"></script>
    <script>
        async function executeStudentLogin() {
            const u = document.getElementById("login-user").value.trim();
            if (!u) {
                if (typeof showMessage === "function")
                    showMessage("Enter LRN to proceed", true);
                else alert("Enter LRN");
                return;
            }

            try {
                const res = await fetch("/api/students/login-by-lrn", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ lrn: u }),
                });
                const data = await res.json();

                if (data.requires_pin) {
                    pendingLrn = u;
                    openStudentPinModal();
                } else if (res.ok) {
                    completeStudentLogin(data);
                } else {
                    if (typeof showMessage === "function")
                        showMessage(data.error || "Student not found", true);
                    else alert(data.error || "Student not found");
                }
            } catch (e) {
                console.error(e);
                alert("Network error");
            }
        }

        function openStudentPinModal() {
            document
                .getElementById("student-pin-modal")
                .classList.remove("hidden");
            document.getElementById("s-pin-error").classList.add("hidden");
            const inputs = document.querySelectorAll(".s-pin-digit");
            inputs.forEach((input) => (input.value = ""));
            inputs[0].focus();
        }

        function closeStudentPinModal() {
            document
                .getElementById("student-pin-modal")
                .classList.add("hidden");
            pendingLrn = "";
        }

        // Handle multi-digit input logic
        document
            .querySelectorAll(".s-pin-digit")
            .forEach((input, index, inputs) => {
                input.addEventListener("input", (e) => {
                    if (e.inputType === "deleteContentBackward") return;
                    if (input.value && index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    }
                    if (Array.from(inputs).every((i) => i.value)) {
                        submitStudentPin();
                    }
                });

                input.addEventListener("keydown", (e) => {
                    if (e.key === "Backspace" && !input.value && index > 0) {
                        inputs[index - 1].focus();
                    }
                });
            });

        async function submitStudentPin() {
            const inputs = document.querySelectorAll(".s-pin-digit");
            const pin = Array.from(inputs)
                .map((i) => i.value)
                .join("");
            if (pin.length !== 6) return;

            const btn = document.getElementById("s-pin-submit-btn");
            const err = document.getElementById("s-pin-error");

            btn.disabled = true;
            btn.innerHTML =
                '<i class="ph ph-circle-notch animate-spin"></i> VERIFYING...';
            err.classList.add("hidden");

            try {
                const res = await fetch("/api/students/verify-qr-pin", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ lrn: pendingLrn, pin: pin }),
                });
                const data = await res.json();

                if (res.ok) {
                    completeStudentLogin(data);
                } else {
                    err.classList.remove("hidden");
                    inputs.forEach((i) => {
                        i.value = "";
                        i.classList.add("border-red-500");
                        setTimeout(
                            () => i.classList.remove("border-red-500"),
                            1000,
                        );
                    });
                    inputs[0].focus();
                }
            } catch (e) {
                alert("Network error");
            } finally {
                btn.disabled = false;
                btn.innerHTML = "VERIFY & LOGIN";
            }
        }
    </script>
</body>
</html>
