<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Educator Portal - Login</title>
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
        <!-- Background Image (Right) -->
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
                    Educator Portal
                </h2>
                <h1
                    id="login-title"
                    class="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2 flex flex-col gap-1"
                >
                    <span class="text-slate-800">Welcome</span>
                    <span class="text-[#b91c1c]">Teacher</span>
                </h1>
                <p class="text-xs text-gray-400 font-medium max-w-[280px]">Enter your credentials to manage your classroom dashboard</p>
            </div>

            <div class="w-full flex flex-col gap-3">
                <div
                    class="relative bg-[#f1f4f9] rounded-[18px] overflow-hidden focus-within:ring-2 focus-within:ring-[#1b4332]/20 transition-all border border-transparent"
                >
                    <label
                        class="absolute left-5 top-3 text-[9px] font-black text-gray-400 uppercase tracking-widest z-10"
                        >Username</label
                    >
                    <input
                        type="text"
                        id="login-user"
                        placeholder="Enter username"
                        class="w-full bg-transparent pt-6 pb-2 px-5 outline-none text-sm font-bold text-slate-700 relative z-20 transition-all"
                    />
                </div>

                <div
                    class="relative bg-[#f1f4f9] rounded-[18px] overflow-hidden focus-within:ring-2 focus-within:ring-[#1b4332]/20 transition-all border border-transparent group"
                >
                    <label
                        class="absolute left-5 top-3 text-[9px] font-black text-gray-400 uppercase tracking-widest z-10"
                        >Password</label
                    >
                    <input
                        type="password"
                        id="login-pass"
                        placeholder="••••••••"
                        class="w-full bg-transparent pt-6 pb-2 pl-5 pr-14 outline-none text-sm font-bold text-slate-700 relative z-20 tracking-wider"
                    />

                    <button
                        type="button"
                        onclick="
                            const p = document.getElementById('login-pass');
                            p.type =
                                p.type === 'password' ? 'text' : 'password';
                            this.querySelector('i').classList.toggle('ph-eye');
                            this.querySelector('i').classList.toggle(
                                'ph-eye-slash',
                            );
                        "
                        class="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 text-gray-400 hover:text-emerald-600 transition-colors rounded-full hover:bg-white/50"
                    >
                        <i class="ph ph-eye-slash text-xl"></i>
                    </button>
                </div>

                <button
                    id="login-btn"
                    onclick="executeTeacherLogin()"
                    class="w-full btn-school-primary text-white font-black tracking-[0.25em] rounded-[18px] mt-2 transition-all shadow-xl shadow-blue-900/30 active:scale-[0.98] text-[13px] uppercase"
                    style="padding: 18px 0"
                >
                    LOGIN AS TEACHER
                </button>
            </div>

            <div class="w-full flex flex-col gap-2 mt-4">
                <button
                    onclick="
                        document
                            .getElementById('teacher-qr-modal')
                            .classList.remove('hidden')
                    "
                    class="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-full py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white hover:border-emerald-200 hover:text-emerald-600 transition-all bg-white/40 backdrop-blur-md shadow-sm group"
                >
                    <i
                        class="ph ph-grid-four text-xl group-hover:scale-110 transition-transform"
                    ></i>
                    FACULTY QR
                </button>
                <button
                    onclick="
                        document
                            .getElementById('qr-scan-modal')
                            .classList.remove('hidden')
                    "
                    class="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-full py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white hover:border-emerald-200 hover:text-emerald-600 transition-all bg-white/40 backdrop-blur-md shadow-sm group"
                >
                    <i
                        class="ph ph-magnifying-glass text-xl group-hover:scale-110 transition-transform"
                    ></i>
                    STUDENT QR
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

    @include ('auth.teacher-modals')

    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script src="https://unpkg.com/html5-qrcode"></script>
    <script src="{{ asset('js/subjectCatalog.js') }}"></script>
    <script src="{{ asset('js/app.js') }}"></script>
    <script>
        function showTeacherError(msg) {
            let errEl = document.getElementById("login-error-msg");
            if (!errEl) {
                errEl = document.createElement("div");
                errEl.id = "login-error-msg";
                errEl.className =
                    "w-full text-center text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl py-2.5 px-3 mt-2";
                document
                    .getElementById("login-btn")
                    .insertAdjacentElement("afterend", errEl);
            }
            errEl.textContent = msg;
        }

        async function executeTeacherLogin() {
            const u = document.getElementById("login-user").value.trim();
            const p = document.getElementById("login-pass").value.trim();

            const errEl = document.getElementById("login-error-msg");
            if (errEl) errEl.textContent = "";

            if (!u || !p) {
                showTeacherError("Please enter both username and password.");
                return;
            }

            const btn = document.getElementById("login-btn");
            btn.disabled = true;
            btn.textContent = "Logging in...";

            try {
                const res = await fetch("/api/teachers/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ username: u, password: p }),
                });
                if (!res.ok) {
                    fetch('/api/activity-logs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify({ action: 'Failed login attempt on Teacher Portal: ' + u, user: 'System' })
                    }).catch(() => {});
                    throw new Error("Invalid username or password.");
                }
                const teacher = await res.json();

                sessionStorage.setItem(
                    "cnhs_session",
                    JSON.stringify({
                        role: "teacher",
                        name: teacher.name,
                        id: teacher.id,
                        db_id: teacher.db_id,
                        subject: teacher.subject,
                        isAdviser: teacher.is_adviser || false,
                        section: teacher.section || null,
                        profile_picture: teacher.profile_picture || null,
                    }),
                );
                window.location.href = "/teacher/dashboard";
            } catch (e) {
                btn.disabled = false;
                btn.style.padding = "18px 0";
                btn.textContent = "LOGIN AS TEACHER";
                showTeacherError(
                    e.message || "Login failed. Please try again.",
                );
            }
        }
    </script>
</body>
</html>
