{{--
    resources/views/dash/main.blade.php
    App shell layout — extended by admin/* and teacher/* blade views.
    Loads all shared scripts (CDN libraries, app.css, app.js, all admin JS).
    Each child view pushes an init script via @push('scripts').
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
    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script src="https://unpkg.com/html5-qrcode"></script>

    {{-- Tailwind Theme Config --}}
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: "#166534",
                        primaryDark: "#14532d",
                        accent: "#f59e0b",
                        surface: "#ffffff",
                        background: "#f3f4f6",
                        textMain: "#1e293b",
                    },
                    animation: {
                        "fade-in": "fadeIn 0.7s ease-out forwards",
                        "slide-up": "slideUp 0.8s ease-out forwards",
                        "scale-up":
                            "scaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                        float: "float 6s ease-in-out infinite",
                        "pulse-slow":
                            "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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
                    },
                },
            },
        };
    </script>

    <link rel="stylesheet" href="{{ asset('css/app.css') }}" />
</head>
<body class="fixed inset-0 flex flex-col overflow-hidden w-full h-full">
    {{-- APP CONTAINER —— direct access (no login screen for this layout) --}}
    <div id="app-container" class="flex h-full w-full">
        {{-- MOBILE OVERLAY --}}
        <div
            id="mobile-overlay"
            onclick="toggleSidebar()"
            class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 hidden lg:hidden transition-opacity opacity-0 pointer-events-none"
        ></div>

        @include ('dash.sidebar')

        {{-- MAIN CONTENT AREA --}}
        <main class="flex-1 flex flex-col h-full overflow-hidden relative">
            {{-- HEADER --}}
            <header
                class="h-16 md:h-20 glass-panel border-b border-gray-200 flex items-center justify-between px-4 md:px-8 z-10 shrink-0 sticky top-0"
            >
                <div class="flex items-center gap-2 md:gap-4 shrink-0">
                    <button
                        class="lg:hidden text-gray-500"
                        onclick="toggleSidebar()"
                    >
                        <i class="fas fa-bars text-lg md:text-xl"></i>
                    </button>
                    <h2
                        class="text-base md:text-xl font-bold text-gray-800 truncate"
                        id="page-title"
                    >
                        Dashboard
                    </h2>
                </div>
                <div
                    class="flex items-center gap-2 sm:gap-4 shrink-0 overflow-hidden"
                >
                    <div
                        class="flex items-center bg-white/60 border border-gray-200 rounded-lg p-0.5 md:p-1 mr-1 md:mr-2 shadow-sm shrink-0"
                    >
                        <i
                            class="fas fa-calendar-alt text-primary mx-1 sm:mx-2 text-[10px] sm:text-xs tracking-tighter"
                        ></i>
                        <select
                            id="global-school-year"
                            onchange="
                                if (typeof setGlobalSchoolYear === 'function')
                                    setGlobalSchoolYear(this.value);
                            "
                            class="bg-transparent text-[10px] sm:text-[11px] font-bold text-gray-700 outline-none cursor-pointer pr-1 sm:pr-4 py-0.5 sm:py-1 uppercase tracking-tighter md:tracking-wider w-full text-ellipsis"
                        >
                            <option value="">Loading...</option>
                        </select>
                    </div>
                    <div class="text-right hidden sm:block shrink-0">
                        <p class="text-sm font-bold text-gray-800 leading-tight" id="user-display-name">User</p>
                        <p class="text-[10px] text-gray-400 uppercase font-bold" id="user-display-role">Role</p>
                    </div>
                    <img
                        id="user-display-avatar"
                        src="https://ui-avatars.com/api/?name=User&background=e5e7eb&color=9ca3af"
                        class="w-8 h-8 md:w-10 md:h-10 rounded-xl border-2 border-gray-100 object-cover shrink-0"
                    />
                </div>
            </header>

            {{-- CONTENT AREA --}}
            <div
                id="content-area"
                class="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth bg-background"
            ></div>

            {{-- REPORT PRINTABLE AREA (HIDDEN ON SCREEN) --}}
            <div
                id="academic-report-area"
                class="hidden flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth bg-white"
            ></div>
        </main>
    </div>

    {{-- ==================== MODALS ==================== --}}

    {{-- AI Document Scanner Modal --}}
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

    {{-- Master Grades Override Modal --}}
    <div
        id="grades-modal"
        class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-scale-up"
            id="modal-container"
        >
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"
                    >
                        <i class="fas fa-edit"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">
                            Master Grade Override
                        </h3>
                        <p class="text-xs text-gray-400 mt-0.5">Edit final subject grades directly</p>
                    </div>
                </div>
                <button
                    onclick="closeGradesModal()"
                    class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition"
                >
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <form onsubmit="saveMasterGrades(event)" class="space-y-5">
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label
                            class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1"
                            >Section</label
                        >
                        <select
                            id="grade-section-select"
                            onchange="filterStudentsBySectionModal()"
                            class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary transition text-sm font-semibold"
                        >
                            <option value="" disabled selected>
                                -- Choose Section --
                            </option>
                        </select>
                    </div>
                    <div class="space-y-1">
                        <label
                            class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1"
                            >Student</label
                        >
                        <select
                            id="grade-student-select"
                            onchange="populateMasterGradeForm()"
                            class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary transition text-sm font-semibold"
                            disabled
                        >
                            <option value="" disabled selected>
                                -- Choose Student --
                            </option>
                        </select>
                    </div>
                </div>

                <div
                    id="grades-form-body"
                    class="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 max-h-[300px] overflow-y-auto"
                >
                    <!-- Form inputs injected by JS -->
                </div>

                <div
                    class="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4"
                >
                    <div class="space-y-1">
                        <label
                            class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1"
                            >Overall Attendance %</label
                        >
                        <input
                            type="number"
                            id="grade-att"
                            min="0"
                            max="100"
                            step="0.01"
                            class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary transition text-sm font-bold"
                        />
                    </div>
                    <div
                        class="bg-primary/5 rounded-xl p-3 flex flex-col justify-center items-center border border-primary/10"
                    >
                        <span
                            class="text-[10px] font-bold text-primary/60 uppercase tracking-widest"
                            >Calculated GWA</span
                        >
                        <span
                            class="text-xl font-black text-primary"
                            id="calc-display"
                            >--</span
                        >
                    </div>
                </div>

                <div class="flex gap-3 pt-2">
                    <button
                        type="button"
                        onclick="closeGradesModal()"
                        class="flex-1 py-3.5 border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        class="flex-[2] py-3.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primaryDark transition shadow-lg shadow-primary/20"
                    >
                        Apply Changes
                    </button>
                </div>
            </form>
        </div>
    </div>

    {{-- Attendance Monthly Breakdown Modal --}}
    <div
        id="attendance-modal"
        class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 animate-scale-up"
        >
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center text-green-600"
                    >
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">
                            Monthly Attendance
                        </h3>
                        <p class="text-xs text-gray-400 mt-0.5" id="att-student-name">Student Attendance Record</p>
                    </div>
                </div>
                <button
                    onclick="closeAttendanceModal()"
                    class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition"
                >
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <table
                    class="w-full text-left border-collapse overflow-hidden rounded-xl border border-gray-100"
                >
                    <thead>
                        <tr
                            class="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100"
                        >
                            <th class="px-4 py-3">Month</th>
                            <th class="px-4 py-3">School Days</th>
                            <th class="px-4 py-3">Days Present</th>
                            <th class="px-4 py-3">Days Absent</th>
                        </tr>
                    </thead>
                    <tbody id="att-table-body" class="text-sm">
                        <!-- Rows injected by JS -->
                    </tbody>
                    <tfoot>
                        <tr
                            class="bg-primary/5 font-bold text-gray-800 border-t-2 border-primary/10"
                        >
                            <td class="px-4 py-3">TOTAL</td>
                            <td class="px-4 py-3" id="att-total-school">0</td>
                            <td
                                class="px-4 py-3 text-primary"
                                id="att-total-present"
                            >
                                0
                            </td>
                            <td
                                class="px-4 py-3 text-red-500"
                                id="att-total-absent"
                            >
                                0
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div class="mt-6 border-t border-gray-100 pt-4">
                    <h4 class="text-sm font-bold text-gray-700 mb-1">Specific Absence Logs</h4>
                    <p class="text-[10px] text-gray-400 mb-3">Record precise dates and times when the student was absent for safety and liability tracking.</p>
                    
                    <div id="absence-logs-container" class="space-y-2 mb-3 max-h-32 overflow-y-auto">
                        <!-- Logs injected by JS -->
                    </div>
                    
                    <div class="flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <input type="datetime-local" id="new-absence-datetime" class="flex-1 px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm outline-none focus:border-primary">
                        <button onclick="addAbsenceLog()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-300 transition whitespace-nowrap shadow-sm">Add Log</button>
                    </div>
                </div>
            </div>

            <div class="flex gap-3 mt-8">
                <button
                    onclick="closeAttendanceModal()"
                    class="flex-1 py-3.5 border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
                >
                    Cancel
                </button>
                <button
                    onclick="saveAttendanceRecord()"
                    class="flex-[2] py-3.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primaryDark transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                    <i class="fas fa-save"></i> Save Attendance
                </button>
            </div>
        </div>
    </div>

    {{-- Student Academic Report Modal --}}
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

    {{-- Student ID Card Modal --}}
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

    {{-- Student QR Scanner Modal (Sidebar button) --}}
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
    {{-- Load core logic --}}
    <script src="{{ asset('js/subjectCatalog.js') }}"></script>
    <script src="{{ asset('js/app.js') }}"></script>

    {{-- Load all admin render functions (shared even for teacher role via role checks) --}}
    <script src="{{ asset('js/admin/dashboard.js') }}"></script>
    <script src="{{ asset('js/admin/addstudents.js') }}"></script>
    <script src="{{ asset('js/admin/records.js') }}"></script>
    <script src="{{ asset('js/admin/manageTeachers.js') }}"></script>
    <script src="{{ asset('js/admin/subjects.js') }}"></script>

    <script src="{{ asset('js/admin/activityLogs.js') }}"></script>
    <script src="{{ asset('js/admin/settings.js') }}"></script>
    <script src="{{ asset('js/admin/assignSection.js') }}"></script>
    <script src="{{ asset('js/admin/maintenance.js') }}"></script>

    {{-- Dashboard Auto-Init: reads session from sessionStorage set by login page --}}
    <script>
        document.addEventListener("DOMContentLoaded", async () => {
            const sessionStr = sessionStorage.getItem("cnhs_session");
            if (!sessionStr) {
                // No session — redirect to login
                window.location.href = "/login/admin";
                return;
            }

            const session = JSON.parse(sessionStr);

            // Populate the global currentUser object (defined in app.js)
            Object.assign(currentUser, session);

            // Show a loading spinner while data is being fetched
            const area = document.getElementById("content-area");
            if (area) {
                area.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full gap-4">
                        <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p class="text-sm font-bold text-gray-400 animate-pulse">Loading system data...</p>
                    </div>`;
            }

            // Update header user info
            const nameEl = document.getElementById("user-display-name");
            const roleEl = document.getElementById("user-display-role");
            const avatarEl = document.getElementById("user-display-avatar");
            if (nameEl) nameEl.innerText = session.name || "User";
            if (roleEl)
                roleEl.innerText = (session.role || "admin").toUpperCase();
            const isInvalidPic =
                !session.profile_picture ||
                session.profile_picture === "null" ||
                session.profile_picture === "";
            const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(session.name || "User")}&background=166534&color=fff&font-size=0.4`;
            if (avatarEl)
                avatarEl.src = isInvalidPic
                    ? defaultAvatar
                    : session.profile_picture;

            // Show role-specific nav items
            if (session.role !== "principal") {
                document.getElementById("nav-add-student")?.classList.remove("hidden");
            }

            if (session.role === "principal") {
                document.getElementById("nav-logs")?.classList.remove("hidden");
                document.getElementById("nav-maintenance")?.classList.remove("hidden");
                // Principal has access to dashboard and records by default
            } else if (session.role === "curriculum_coordinator") {
                document.getElementById("nav-manage-teachers")?.classList.remove("hidden");
                document.getElementById("nav-subjects")?.classList.remove("hidden");
                document.getElementById("nav-assign-section")?.classList.remove("hidden");
                document.getElementById("nav-logs")?.classList.remove("hidden");
                document.getElementById("nav-maintenance")?.classList.remove("hidden");
            } else if (session.role === "admin") {
                // Fallback for old sessions
                document.getElementById("nav-manage-teachers")?.classList.remove("hidden");
                document.getElementById("nav-subjects")?.classList.remove("hidden");
                document.getElementById("nav-assign-section")?.classList.remove("hidden");
                document.getElementById("nav-logs")?.classList.remove("hidden");
                document.getElementById("nav-maintenance")?.classList.remove("hidden");
            } else if (session.role === "teacher") {
                document.getElementById("nav-logs")?.classList.remove("hidden");
            }
            if (session.isAdviser) {
                document.getElementById("nav-adviser")?.classList.remove("hidden");
            }
            document.getElementById("nav-settings")?.classList.remove("hidden");
            
            // Set Department tag in Sidebar if Curriculum Coordinator
            if (session.role === "curriculum_coordinator") {
                const roleTag = document.getElementById("role-tag");
                if (roleTag) {
                    roleTag.innerText = "COORDINATOR: " + (session.department || "").toUpperCase();
                    roleTag.classList.add("bg-accent/20", "text-accent", "border-accent/40");
                    roleTag.classList.remove("bg-white/10", "bg-primary/20");
                }
            } else if (session.role === "principal") {
                const roleTag = document.getElementById("role-tag");
                if (roleTag) {
                    roleTag.innerText = "PRINCIPAL";
                    roleTag.classList.add("bg-blue-500/20", "text-blue-300", "border-blue-500/40");
                    roleTag.classList.remove("bg-white/10");
                }
            }

            // Determine which view to show based on the current URL path
            const urlToView = {
                dashboard: "dashboard",
                "add-students": "add-student",
                records: "records",
                "manage-teachers": "manage-teachers",
                subjects: "subjects",
                "assign-section": "assign-section",
                "activity-logs": "logs",
                analytics: "analytics",
                settings: "settings",
            };
            const lastSegment =
                window.location.pathname.split("/").filter(Boolean).pop() ||
                "dashboard";
            const currentView = urlToView[lastSegment] || "dashboard";

            // Load all data from the server, then render the correct view
            await initAppData();
            navigate(currentView, true);
        });
    </script>

    {{-- Child views push their page-init scripts here --}}
    @stack ('scripts')
</body>
</html>
