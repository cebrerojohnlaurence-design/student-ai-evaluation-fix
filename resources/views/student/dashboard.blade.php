<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Student Dashboard | CNHS Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
    />
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ["Inter", "sans-serif"] },
                    colors: {
                        primary: "#166534",
                        primaryLight: "#bbf7d0",
                        primaryDark: "#14532d",
                        accent: "#f59e0b",
                    },
                },
            },
        };
    </script>
</head>
<body
    class="bg-gray-50 text-gray-800 antialiased min-h-screen flex flex-col font-sans"
>
    <!-- Top Navigation Bar -->
    <nav class="bg-primary text-white shadow-lg sticky top-0 z-50">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20"
                    >
                        <i
                            class="fas fa-graduation-cap text-accent text-xl"
                        ></i>
                    </div>
                    <div>
                        <h1
                            class="text-sm font-bold tracking-tight leading-tight"
                        >
                            City National High School
                        </h1>
                        <p class="text-[10px] text-primaryLight uppercase tracking-wider font-semibold">Student Portal</p>
                    </div>
                </div>

                <div class="flex items-center gap-4">
                    <div class="hidden sm:block text-right">
                        <p id="nav-student-name" class="text-sm font-bold leading-tight">Loading...</p>
                        <p id="nav-student-lrn" class="text-xs text-primaryLight">...</p>
                    </div>
                    <button
                        onclick="logoutStudent()"
                        class="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-bold transition-all text-white flex items-center gap-2"
                    >
                        <i class="fas fa-sign-out-alt"></i>
                        <span class="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Dashboard Content -->
    <main
        class="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 animate-fade-in relative"
    >
        <div
            id="loading-spinner"
            class="absolute inset-0 z-10 bg-gray-50/80 backdrop-blur-sm flex flex-col items-center justify-center mt-20"
        >
            <i
                class="fas fa-circle-notch fa-spin text-4xl text-primary mb-4"
            ></i>
            <p class="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading Records...</p>
        </div>

        <div id="dashboard-content" class="hidden space-y-8">
            <!-- Student Header Profile -->
            <div
                class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden"
            >
                <div
                    class="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"
                ></div>

                <div
                    class="relative group cursor-pointer flex-shrink-0"
                    onclick="triggerProfileUpload()"
                >
                    <img
                        id="profile-avatar"
                        src="https://ui-avatars.com/api/?name=Student&background=166534&color=fff&font-size=0.4"
                        class="w-24 h-24 rounded-2xl shadow-md border-4 border-white object-cover transition-opacity"
                    />
                    <div
                        class="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    >
                        <i class="fas fa-camera text-white text-xl"></i>
                    </div>
                    <input
                        type="file"
                        id="profile-upload-input"
                        class="hidden"
                        accept="image/*"
                        onchange="handleProfileUpload(this)"
                    />
                </div>

                <div class="flex-grow text-center sm:text-left z-10">
                    <h2
                        id="student-name"
                        class="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight leading-tight"
                    >
                        Student Name
                    </h2>
                    <p class="text-sm font-bold text-gray-400 mt-1 uppercase tracking-wider block hidden">LRN: <span id="student-lrn" class="text-gray-600">0000000000</span></p>

                    <div class="mt-2 flex flex-col gap-1 w-max">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">USERNAME: <span id="student-username" class="text-gray-700 font-mono font-bold">--</span></p>
                    </div>

                    <div
                        class="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4"
                    >
                        <span
                            class="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold flex items-center gap-1.5"
                        >
                            <i class="fas fa-layer-group"></i>
                            <span id="student-section">Section</span>
                        </span>
                        <span
                            class="px-3 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-xs font-bold flex items-center gap-1.5"
                        >
                            <i class="fas fa-chalkboard-teacher"></i>
                            <span id="student-adviser">Adviser</span>
                        </span>
                        <span
                            id="student-status"
                            class="px-3 py-1 bg-green-50 text-green-600 border border-green-200 rounded-full text-xs font-bold flex items-center gap-1.5"
                        >
                            <i class="fas fa-check-circle"></i> Enrolled
                        </span>
                        <button
                            onclick="openQrPinModal()"
                            class="px-3 py-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm rounded-full text-xs font-bold flex items-center gap-1.5 transition"
                        >
                            <i class="fas fa-fingerprint text-gray-400"></i>
                            <span id="pin-status-text">Setup QR PIN</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Stats Overview -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <!-- GWA Card -->
                <div
                    class="bg-gradient-to-br from-primary to-primaryDark text-white rounded-3xl p-6 shadow-md relative overflow-hidden"
                >
                    <div
                        class="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4"
                    >
                        <i class="fas fa-star text-9xl"></i>
                    </div>
                    <div class="relative z-10">
                        <h3
                            class="text-xs font-bold text-primaryLight uppercase tracking-widest mb-1"
                        >
                            General Weighted Average
                        </h3>
                        <div class="flex items-end gap-3">
                            <span id="student-gwa" class="text-5xl font-black"
                                >--</span
                            >
                            <span
                                id="honor-badge"
                                class="hidden pb-1 px-2.5 py-0.5 bg-accent text-white text-[10px] font-black uppercase tracking-wider rounded border border-white/20 shadow-sm"
                                >With Honors</span
                            >
                        </div>
                    </div>
                </div>

                <!-- Academic Risk -->
                <div
                    class="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col justify-center"
                >
                    <h3
                        class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                    >
                        Academic Status
                    </h3>
                    <div class="flex items-center gap-3">
                        <div
                            id="risk-icon"
                            class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                        >
                            <i class="fas fa-shield-alt text-gray-400"></i>
                        </div>
                        <div>
                            <span
                                id="student-risk"
                                class="text-xl font-black text-gray-800 block leading-tight"
                                >Evaluating...</span
                            >
                            <span class="text-xs text-gray-400 font-medium"
                                >Risk Assessment</span
                            >
                        </div>
                    </div>
                </div>

                <!-- Attendance -->
                <div
                    class="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col justify-center"
                >
                    <h3
                        class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                    >
                        Attendance Record
                    </h3>
                    <div class="flex items-center gap-3">
                        <div
                            class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"
                        >
                            <i class="fas fa-calendar-check text-blue-500"></i>
                        </div>
                        <div>
                            <div
                                class="flex items-baseline gap-1 block leading-tight"
                            >
                                <span
                                    id="student-attendance"
                                    class="text-xl font-black text-blue-600"
                                    >--</span
                                >
                                <span class="text-sm font-bold text-gray-400"
                                    >%</span
                                >
                            </div>
                            <span class="text-xs text-gray-400 font-medium"
                                >Present Days</span
                            >
                        </div>
                    </div>
                </div>
            </div>

            <!-- Subject Grades Section -->
            <div class="space-y-6">
                <div
                    class="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4"
                >
                    <div>
                        <h3
                            class="text-xl font-black text-gray-800 tracking-tight"
                        >
                            Academic Performance
                        </h3>
                        <p id="grades-subtitle" class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Quarterly Grade Breakdown</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <select
                            id="enrollment-selector"
                            onchange="renderEnrolledGrades()"
                            class="hidden px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-wider text-gray-600 outline-none focus:border-primary shadow-sm cursor-pointer appearance-none pr-8"
                        ></select>
                        <div
                            class="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-primary"
                        >
                            <i class="fas fa-book-open"></i>
                        </div>
                    </div>
                </div>

                <!-- Matrix View active indicator (Cards removed by Panel request) -->

                <div
                    class="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden"
                >
                    <div
                        class="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30"
                    >
                        <span
                            id="active-quarter-label"
                            class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400"
                            >Loading records...</span
                        >
                        <div class="flex items-center gap-1.5">
                            <div
                                class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"
                            ></div>
                            <span
                                class="text-[10px] font-black text-green-600 uppercase tracking-widest"
                                >LIVE RECORDS</span
                            >
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse min-w-[800px]">
                            <thead id="grades-table-head">
                                <tr
                                    class="bg-gray-50 border-b border-gray-100 text-[10px] uppercase font-bold text-gray-400 tracking-wider"
                                >
                                    <th class="py-4 px-6 text-left">Learning Area</th>
                                    <th class="py-4 px-4 text-center">1</br>Qtr</th>
                                    <th class="py-4 px-4 text-center">2</br>Qtr</th>
                                    <th class="py-4 px-4 text-center">3</br>Qtr</th>
                                    <th class="py-4 px-4 text-center">4</br>Qtr</th>
                                    <th class="py-4 px-4 text-center">Final</br>Grade</th>
                                    <th class="py-4 px-4 text-center rounded-tr-3xl">Remarks</th>
                                </tr>
                            </thead>
                            <tbody
                                id="grades-table-body"
                                class="divide-y divide-gray-50"
                            >
                                <!-- Injected matrix rows -->
                            </tbody>
                            <tfoot id="grades-table-foot" class="hidden">
                                <tr class="bg-gray-50/80 border-t-2 border-gray-200">
                                    <td class="py-5 px-6 text-right text-sm font-black text-gray-600 uppercase tracking-widest" colspan="5">
                                        General Weighted Average
                                    </td>
                                    <td class="py-5 px-4 text-center text-lg font-black text-gray-800" id="matrix-gwa-val">
                                        --
                                    </td>
                                    <td class="py-5 px-4 text-center" id="matrix-gwa-remarks">
                                        --
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div
                    class="text-center pb-8 border-t border-gray-200 mt-8 pt-8"
                >
                    <p class="text-xs text-gray-400">If you notice any discrepancies in your records, please approach your adviser.</p>
                </div>
            </div>
    </main>

    <!-- Custom Notification Wrapper -->
    <style>
        .animate-fade-in {
            animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>

    <!-- Setup QR PIN Modal -->
    <div
        id="qr-pin-modal"
        class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-gray-900/60 backdrop-blur-sm"
    >
        <div
            class="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-fade-in relative overflow-hidden"
        >
            <div
                class="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"
            ></div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">Security PIN</h3>
            <p class="text-xs text-gray-500 mb-6" id="qr-pin-desc">Create a 6-digit PIN to secure your QR Code login.</p>
            <div class="space-y-4 relative z-10">
                <input
                    type="password"
                    id="qr-pin-input"
                    maxlength="6"
                    inputmode="numeric"
                    placeholder="------"
                    class="w-full text-center text-3xl font-mono tracking-[0.5em] font-black border border-gray-200 rounded-xl px-4 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-700"
                />
                <p id="qr-pin-error" class="text-xs font-bold text-red-500 hidden text-center"></p>
                <div class="flex gap-3 mt-4">
                    <button
                        onclick="closeQrPinModal()"
                        class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onclick="saveQrPin()"
                        id="qr-pin-save-btn"
                        class="flex-1 py-3 bg-primary hover:bg-primaryDark text-white font-bold rounded-xl transition shadow-md text-sm"
                    >
                        Save PIN
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Notification Toast component could go here -->

    <script src="{{ asset('js/student/dashboard.js') }}"></script>
</body>
</html>
