{{--
    resources/views/login.blade.php
    Full SPA entry page — contains both login screen and the app shell.
    JavaScript controls which panel is visible (login or app-container).
    This is the main working page for the application.
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CNHS | AI-Driven Student Evaluation System</title>

    {{-- CDN Libraries --}}
    <script src="https://cdn.tailwindcss.com"></script>
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script src="https://unpkg.com/html5-qrcode"></script>

    {{-- Premium Fonts --}}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet"
    />

    {{-- Tailwind Theme Config --}}
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: "#064e3b", // Deep Emerald
                        primaryLight: "#065f46",
                        primaryDark: "#022c22",
                        accent: "#d4af37", // Radiant Gold
                        accentLight: "#f1c40f",
                        surface: "#ffffff",
                        background: "#f8fafc",
                        textMain: "#0f172a",
                    },
                    fontFamily: {
                        sans: ["Inter", "sans-serif"],
                        outfit: ["Outfit", "sans-serif"],
                    },
                    animation: {
                        "fade-in": "fadeIn 0.7s ease-out forwards",
                        "slide-up": "slideUp 0.8s ease-out forwards",
                        "scale-up":
                            "scaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                        float: "float 6s ease-in-out infinite",
                        shine: "shine 3s infinite",
                    },
                    keyframes: {
                        fadeIn: {
                            "0%": { opacity: "0" },
                            "100%": { opacity: "1" },
                        },
                        slideUp: {
                            "0%": {
                                transform: "translateY(30px)",
                                opacity: "0",
                            },
                            "100%": {
                                transform: "translateY(0)",
                                opacity: "1",
                            },
                        },
                        scaleUp: {
                            "0%": { transform: "scale(0.9)", opacity: "0" },
                            "100%": { transform: "scale(1)", opacity: "1" },
                        },
                        float: {
                            "0%, 100%": { transform: "translateY(0)" },
                            "50%": { transform: "translateY(-20px)" },
                        },
                        shine: {
                            "0%": { backgroundPosition: "-200% center" },
                            "100%": { backgroundPosition: "200% center" },
                        },
                    },
                },
            },
        };
    </script>

    <style>
        body {
            font-family: "Inter", sans-serif;
        }
        .font-outfit {
            font-family: "Outfit", sans-serif;
        }
        .glass {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .glass-dark {
            background: rgba(6, 78, 59, 0.8);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .text-shine {
            background: linear-gradient(90deg, #d4af37, #f1c40f, #d4af37);
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shine 4s linear infinite;
        }
        .scanner-line {
            position: absolute;
            width: 100%;
            height: 2px;
            background: linear-gradient(
                to right,
                transparent,
                #d4af37,
                transparent
            );
            top: 0;
            animation: scan 2s linear infinite;
        }
        @keyframes scan {
            0% {
                top: 0;
            }
            100% {
                top: 100%;
            }
        }
    </style>

    <link rel="stylesheet" href="{{ asset('css/app.css') }}" />
</head>
<body
    class="h-screen flex flex-col font-sans bg-background selection:bg-accent/30 selection:text-primaryDark"
>
    {{-- ==================== LOGIN SCREEN ==================== --}}
    <div
        id="login-screen"
        class="flex flex-col lg:flex-row h-full overflow-hidden"
    >
        {{-- LEFT PANEL — Hero --}}
        <div
            class="hidden lg:flex lg:w-[55%] bg-primaryDark flex-col items-center justify-center p-16 relative overflow-hidden"
        >
            {{-- Luxury Background Elements --}}
            <div class="absolute inset-0 z-0">
                <div
                    class="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[160px] animate-float"
                ></div>
                <div
                    class="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-accent/10 rounded-full blur-[160px] animate-float"
                    style="animation-delay: -3s"
                ></div>
                {{-- Texture overlay --}}
                <div
                    class="absolute inset-0 opacity-[0.03]"
                    style="
                        background-image: url(&quot;https://www.transparenttextures.com/patterns/carbon-fibre.png&quot;);
                    "
                ></div>
            </div>

            <div class="relative z-10 text-center animate-slide-up">
                <div
                    class="w-36 h-36 glass-dark rounded-[3rem] flex items-center justify-center mx-auto mb-12 shadow-[0_0_50px_rgba(6,78,59,0.3)] border border-white/20 animate-float"
                >
                    <i
                        class="fas fa-graduation-cap text-7xl text-accent drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]"
                    ></i>
                </div>
                <h1
                    class="text-6xl font-black text-white leading-tight mb-8 tracking-tighter font-outfit"
                >
                    City National<br />
                    <span class="text-shine">High School</span>
                </h1>
                <p class="text-xl text-white/60 max-w-md mx-auto leading-relaxed font-light font-outfit">Pioneering the future of education with <span class="text-accent font-semibold">AI-Integrated Evaluation</span>.</p>

                <div
                    class="mt-16 grid grid-cols-1 gap-4 text-left max-w-sm mx-auto"
                >
                    <div
                        class="flex items-center gap-4 glass-dark rounded-2xl p-4 transform hover:scale-105 transition-transform cursor-default group"
                    >
                        <div
                            class="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors"
                        >
                            <i class="fas fa-brain text-accent text-xl"></i>
                        </div>
                        <div>
                            <span class="text-white font-bold text-sm block"
                                >Neural Evaluation</span
                            >
                            <span
                                class="text-white/50 text-[11px] uppercase tracking-wider"
                                >AI-Powered Grade Extraction</span
                            >
                        </div>
                    </div>
                    <div
                        class="flex items-center gap-4 glass-dark rounded-2xl p-4 transform hover:scale-105 transition-transform cursor-default group"
                        style="animation-delay: 0.1s"
                    >
                        <div
                            class="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors"
                        >
                            <i class="fas fa-qrcode text-accent text-xl"></i>
                        </div>
                        <div>
                            <span class="text-white font-bold text-sm block"
                                >Digital Identity</span
                            >
                            <span
                                class="text-white/50 text-[11px] uppercase tracking-wider"
                                >QR-Verified Student Profiles</span
                            >
                        </div>
                    </div>
                    <div
                        class="flex items-center gap-4 glass-dark rounded-2xl p-4 transform hover:scale-105 transition-transform cursor-default group"
                        style="animation-delay: 0.2s"
                    >
                        <div
                            class="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors"
                        >
                            <i
                                class="fas fa-chart-line text-accent text-xl"
                            ></i>
                        </div>
                        <div>
                            <span class="text-white font-bold text-sm block"
                                >Cognitive Analytics</span
                            >
                            <span
                                class="text-white/50 text-[11px] uppercase tracking-wider"
                                >Real-Time Performance Insight</span
                            >
                        </div>
                    </div>
                </div>
            </div>

            {{-- Footer Citation --}}
            <div class="absolute bottom-10 left-0 right-0 text-center z-10">
                <p class="text-[10px] text-white/30 uppercase tracking-[0.4em] font-bold">Standard of Excellence</p>
            </div>
        </div>

        {{-- RIGHT PANEL — Login Form --}}
        <div
            class="flex-1 flex items-center justify-center p-8 lg:p-16 bg-background overflow-y-auto relative"
        >
            <div class="w-full max-w-md relative z-10">
                {{-- Mobile Logo --}}
                <div class="lg:hidden text-center mb-12 animate-fade-in">
                    <div
                        class="w-28 h-28 bg-gradient-to-br from-primary to-primaryDark rounded-[2.8rem] flex items-center justify-center mx-auto mb-8 shadow-2xl border-4 border-white transform -rotate-3"
                    >
                        <i
                            class="fas fa-graduation-cap text-5xl text-accent drop-shadow-xl"
                        ></i>
                    </div>
                    <h1
                        class="text-5xl font-black text-primaryDark tracking-tighter leading-none font-outfit mb-2"
                    >
                        City National
                    </h1>
                    <p class="text-accent font-bold uppercase tracking-widest text-xs">High School</p>
                </div>

                <div class="mb-10 animate-slide-up">
                    <h2
                        class="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight mb-3"
                    >
                        Welcome back
                    </h2>
                    <p class="text-gray-500 font-medium text-lg">Empowering academic excellence with <span class="text-primary font-bold">AI intelligence</span>.</p>
                </div>

                {{-- Login Card with Glassmorphism --}}
                <div
                    class="bg-white/70 backdrop-blur-xl border border-white/40 p-1 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] mb-8 animate-scale-up"
                >
                    <div
                        class="bg-white p-8 lg:p-10 rounded-[2.2rem] shadow-sm"
                    >
                        <div class="space-y-5">
                            <div class="relative group">
                                <div
                                    class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-primary text-gray-400"
                                >
                                    <i class="fas fa-user-circle text-lg"></i>
                                </div>
                                <input
                                    type="text"
                                    id="login-user"
                                    placeholder="Username"
                                    class="w-full pl-12 pr-6 py-4.5 bg-gray-50 border-2 border-transparent rounded-2xl text-base font-semibold focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>

                            <div class="relative group">
                                <div
                                    class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-primary text-gray-400"
                                >
                                    <i class="fas fa-key text-lg"></i>
                                </div>
                                <input
                                    type="password"
                                    id="login-pass"
                                    placeholder="Password"
                                    class="w-full pl-12 pr-6 py-4.5 bg-gray-50 border-2 border-transparent rounded-2xl text-base font-semibold focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-gray-400"
                                    onkeypress="
                                        if (event.key === 'Enter')
                                            login(
                                                document.getElementById(
                                                    'active-role',
                                                ).value || 'admin',
                                            );
                                    "
                                />
                            </div>
                            <input type="hidden" id="active-role" value="" />
                        </div>

                        {{-- Error Message --}}
                        <div id="login-error" class="hidden mt-5">
                            <div
                                class="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-xl border border-red-100 flex items-center gap-2"
                            >
                                <i class="fas fa-exclamation-circle"></i>
                                <span id="error-text"></span>
                            </div>
                        </div>

                        {{-- Login Buttons --}}
                        <div class="grid grid-cols-2 gap-4 mt-8">
                            <button
                                onclick="
                                    document.getElementById(
                                        'active-role',
                                    ).value = 'admin';
                                    login('admin');
                                "
                                class="group relative overflow-hidden py-5 bg-gray-900 text-white rounded-2xl font-bold text-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 active:scale-95 border border-white/10"
                            >
                                <div
                                    class="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                                ></div>
                                <div
                                    class="relative flex flex-col items-center gap-2"
                                >
                                    <i
                                        class="fas fa-shield-alt text-accent text-xl transition-transform group-hover:scale-125 duration-500"
                                    ></i>
                                    <span>Admin Portal</span>
                                </div>
                            </button>
                            <button
                                onclick="
                                    document.getElementById(
                                        'active-role',
                                    ).value = 'teacher';
                                    login('teacher');
                                "
                                class="group relative overflow-hidden py-5 bg-white text-gray-800 border-2 border-gray-100 rounded-2xl font-bold text-sm transition-all duration-300 hover:shadow-2xl hover:border-primary/30 hover:text-primary hover:-translate-y-1 active:scale-95 shadow-sm"
                            >
                                <div
                                    class="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                                ></div>
                                <div
                                    class="relative flex flex-col items-center gap-2"
                                >
                                    <i
                                        class="fas fa-chalkboard-teacher text-primary text-xl transition-transform group-hover:scale-125 duration-500"
                                    ></i>
                                    <span>Teacher Office</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {{-- Student QR Button --}}
                <div
                    class="text-center animate-slide-up"
                    style="animation-delay: 0.4s"
                >
                    <div class="flex items-center gap-4 mb-6">
                        <div class="h-px flex-1 bg-gray-200"></div>
                        <p class="text-[11px] text-gray-400 uppercase font-black tracking-[0.2em]">Student Access</p>
                        <div class="h-px flex-1 bg-gray-200"></div>
                    </div>
                    <button
                        onclick="
                            document
                                .getElementById('qr-scan-modal')
                                .classList.remove('hidden')
                        "
                        class="w-full py-5 border-2 border-dashed border-gray-200 rounded-[1.5rem] text-sm font-bold text-gray-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                        <div
                            class="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors"
                        >
                            <i class="fas fa-qrcode text-lg"></i>
                        </div>
                        <span>Scan ID for Performance Report</span>
                    </button>
                </div>

                <div
                    class="mt-8 flex justify-center gap-4 text-[10px] text-gray-300 font-mono"
                >
                    <span
                        class="hover:text-primary cursor-help"
                        title="admin / admin123"
                        >Admin Access</span
                    >
                    <span class="text-gray-200">|</span>
                    <span
                        class="hover:text-primary cursor-help"
                        title="clara123 / teach123"
                        >Teacher Access</span
                    >
                </div>
            </div>
        </div>
    </div>

    {{-- ==================== APP CONTAINER (hidden until login) ==================== --}}
    <div id="app-container" class="hidden flex h-full relative">
        {{-- Mobile Backdrop/Overlay --}}
        <div
            id="mobile-overlay"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 hidden opacity-0 transition-opacity duration-300 lg:hidden"
            onclick="toggleSidebar()"
        ></div>

        @include ('dash.sidebar')

        {{-- MAIN CONTENT AREA --}}
        <main class="flex-1 flex flex-col h-full overflow-hidden relative">
            {{-- HEADER --}}
            <header
                class="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-20 shrink-0"
            >
                <div class="flex items-center gap-4">
                    <button
                        class="lg:hidden text-gray-500"
                        onclick="toggleSidebar()"
                    >
                        <i class="fas fa-bars text-xl"></i>
                    </button>
                    <h2 class="text-xl font-bold text-gray-800" id="page-title">
                        Dashboard
                    </h2>
                </div>
                <div class="flex items-center gap-4">
                    <div class="text-right hidden sm:block">
                        <p class="text-sm font-bold text-gray-800 leading-tight" id="user-display-name">User</p>
                        <p class="text-[10px] text-gray-400 uppercase font-bold" id="user-display-role">Role</p>
                    </div>
                    <img
                        id="user-display-avatar"
                        src=""
                        class="w-10 h-10 rounded-xl border-2 border-gray-100 object-cover"
                    />
                </div>
            </header>

            {{-- CONTENT AREA --}}
            <div
                id="content-area"
                class="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth bg-background"
            ></div>
        </main>
    </div>

    {{-- ==================== MODALS ==================== --}}

    {{-- AI Document Scanner --}}
    <div
        id="camera-modal"
        class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-up"
        >
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h3
                        class="text-xl font-bold text-gray-800"
                        id="camera-title"
                    >
                        AI Document Scanner
                    </h3>
                    <p class="text-xs text-gray-400 mt-1" id="camera-hint">Upload your document image</p>
                </div>
                <button
                    onclick="closeCameraModal()"
                    class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition text-sm"
                >
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <label for="doc-upload" class="block cursor-pointer">
                <div
                    class="w-full h-52 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden relative hover:border-primary transition group"
                >
                    <img
                        id="doc-preview"
                        src=""
                        class="hidden w-full h-full object-contain"
                    />
                    <div
                        id="doc-placeholder"
                        class="flex flex-col items-center justify-center gap-3 group-hover:opacity-60 transition"
                    >
                        <i class="fas fa-file-image text-4xl text-gray-300"></i>
                        <p class="text-xs text-gray-400">Click to upload document image</p>
                        <p class="text-[10px] text-gray-300">Supports JPG, PNG, WebP</p>
                    </div>
                </div>
                <input
                    type="file"
                    id="doc-upload"
                    class="hidden"
                    accept="image/*"
                    onchange="handleDocPreview(this)"
                />
            </label>
            <div
                id="processing-status"
                class="hidden mt-4 bg-green-50 rounded-xl p-4 flex items-center gap-3 border border-green-200"
            >
                <div class="spinner shrink-0"></div>
                <div>
                    <p class="text-xs font-bold text-primary">AI Processing...</p>
                    <p class="text-[10px] text-gray-400">Gemini is analyzing your document</p>
                </div>
            </div>
            <button
                id="process-btn"
                onclick="processAI()"
                disabled
                class="mt-4 w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm transition shadow-md hover:bg-primaryDark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <i class="fas fa-brain"></i> Process with AI
            </button>
        </div>
    </div>

    {{-- Master Grades Override --}}
    <div
        id="grades-modal"
        class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-scale-up"
        >
            <div class="flex justify-between items-center mb-5">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">
                        Encode / Override Grades
                    </h3>
                    <p class="text-xs text-gray-400">Select a student to edit their master record.</p>
                </div>
                <button
                    onclick="closeGradesModal()"
                    class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition text-sm"
                >
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label
                        class="text-[10px] font-bold text-gray-500 uppercase mb-1 block"
                        >Section</label
                    >
                    <select
                        id="grade-section-select"
                        onchange="filterStudentsBySectionModal()"
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-primary bg-white cursor-pointer"
                    >
                        <option value="" disabled selected>
                            -- Choose Section --
                        </option>
                    </select>
                </div>
                <div>
                    <label
                        class="text-[10px] font-bold text-gray-500 uppercase mb-1 block"
                        >Student</label
                    >
                    <select
                        id="grade-student-select"
                        onchange="populateMasterGradeForm()"
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-primary bg-white cursor-pointer"
                        disabled
                    >
                        <option value="" disabled selected>
                            -- Choose Student --
                        </option>
                    </select>
                </div>
            </div>
            <form onsubmit="saveMasterGrades(event)" class="space-y-4">
                <div id="grade-form-dynamic-area"></div>
                <button
                    type="submit"
                    class="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm transition shadow-md hover:bg-primaryDark flex items-center justify-center gap-2"
                >
                    <i class="fas fa-save"></i> Save Evaluation
                </button>
            </form>
        </div>
    </div>

    {{-- Student Academic Report --}}
    <div
        id="report-modal"
        class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-8 animate-scale-up"
        >
            <div id="report-content"></div>
        </div>
    </div>

    {{-- Attendance Management Modal --}}
    <div
        id="attendance-modal"
        class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 animate-scale-up"
        >
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h3
                        class="text-xl font-bold text-gray-800"
                        id="att-student-name"
                    >
                        Attendance Record
                    </h3>
                    <p class="text-xs text-gray-400 mt-1">Manage monthly school days and days present</p>
                </div>
                <button
                    onclick="
                        document
                            .getElementById('attendance-modal')
                            .classList.add('hidden')
                    "
                    class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition text-sm"
                >
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div
                class="max-h-[60vh] overflow-y-auto mb-6 rounded-2xl border border-gray-100"
            >
                <table class="w-full text-sm text-left">
                    <thead
                        class="bg-gray-50 text-[10px] font-bold uppercase text-gray-400 sticky top-0 z-10"
                    >
                        <tr>
                            <th class="px-4 py-3">Month</th>
                            <th class="px-4 py-3">School Days</th>
                            <th class="px-4 py-3">Days Present</th>
                            <th class="px-4 py-3">Absent</th>
                        </tr>
                    </thead>
                    <tbody
                        id="att-table-body"
                        class="divide-y divide-gray-50"
                    ></tbody>
                </table>
            </div>

            <div class="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
                <div class="text-center">
                    <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Total School</p>
                    <p class="text-xl font-bold text-gray-800" id="att-total-school">0</p>
                </div>
                <div class="text-center">
                    <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Present</p>
                    <p class="text-xl font-bold text-primary" id="att-total-present">0</p>
                </div>
                <div class="text-center">
                    <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Absent</p>
                    <p class="text-xl font-bold text-red-500" id="att-total-absent">0</p>
                </div>
            </div>

            <button
                onclick="saveAttendanceRecord()"
                class="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm transition shadow-md hover:bg-primaryDark flex items-center justify-center gap-2"
            >
                <i class="fas fa-save"></i> Save Attendance
            </button>
        </div>
    </div>

    {{-- Student ID Card --}}
    <div
        id="id-card-modal"
        class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-8 animate-scale-up flex flex-col items-center"
        >
            <div class="w-full flex justify-end mb-4 no-print">
                <button
                    onclick="closeQRModal()"
                    class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition text-sm"
                >
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div
                id="id-card-content"
                class="w-full flex flex-col items-center"
            ></div>
        </div>
    </div>

    {{-- Student QR Scanner (from sidebar) --}}
    <div
        id="qr-scan-modal"
        class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-scale-up"
        >
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">
                        Scan Student QR
                    </h3>
                    <p class="text-xs text-gray-400 mt-1">View individual student academic report</p>
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
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div
                class="w-full rounded-2xl bg-gray-900 overflow-hidden relative"
                style="aspect-ratio: 1/1; min-height: 240px"
            >
                <div id="qr-reader" class="hidden w-full h-full"></div>
                <div
                    id="qr-loading"
                    class="hidden absolute inset-0 flex items-center justify-center bg-black/50"
                >
                    <div class="spinner"></div>
                </div>
                <div
                    id="qr-entry-zone"
                    class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white"
                >
                    <div
                        class="relative w-32 h-32 border-4 border-white/30 rounded-2xl flex items-center justify-center"
                    >
                        <div class="scanner-line"></div>
                        <i class="fas fa-qrcode text-5xl text-white/20"></i>
                    </div>
                    <p class="text-xs text-white/60">Position QR code in frame</p>
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
                    <i class="fas fa-stop-circle"></i> Stop Camera
                </button>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3">
                <button
                    onclick="startCameraScanner()"
                    class="col-span-1 py-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primaryDark transition flex items-center justify-center gap-2 shadow-md"
                >
                    <i class="fas fa-camera"></i> Use Camera
                </button>
                <button
                    onclick="triggerQrFile()"
                    class="col-span-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2"
                >
                    <i class="fas fa-image"></i> Upload Image
                </button>
            </div>
        </div>
    </div>

    {{-- Hidden canvas for image processing --}}
    <canvas id="canvas-tool" class="hidden"></canvas>

    {{-- ==================== SCRIPTS ==================== --}}
    {{-- Subject catalog (must load before app.js and all admin JS) --}}
    <script src="{{ asset('js/subjectCatalog.js') }}"></script>
    {{-- Core logic --}}
    <script src="{{ asset('js/app.js') }}"></script>

    {{-- All render functions (admin + shared for teacher) --}}
    <script src="{{ asset('js/admin/dashboard.js') }}"></script>
    <script src="{{ asset('js/admin/addstudents.js') }}"></script>
    <script src="{{ asset('js/admin/records.js') }}"></script>
    <script src="{{ asset('js/admin/manageTeachers.js') }}"></script>
    <script src="{{ asset('js/admin/subjects.js') }}"></script>
    <script src="{{ asset('js/admin/assignSection.js') }}"></script>

    <script src="{{ asset('js/admin/activityLogs.js') }}"></script>
    <script src="{{ asset('js/admin/settings.js') }}"></script>
    <script src="{{ asset('js/admin/maintenance.js') }}"></script>
</body>
</html>
