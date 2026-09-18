{{-- resources/views/dash/sidebar.blade.php --}}
{{-- Sidebar navigation partial - included in dash.main --}}

<aside
    id="sidebar"
    class="mobile-hidden w-72 flex flex-col h-full shrink-0 shadow-xl lg:shadow-none z-50 lg:z-30 fixed lg:relative left-0 top-0 bg-gradient-to-b from-primary to-primaryDark text-white overflow-hidden"
>
    <!-- BRAND & TOGGLE -->
    <div
        class="px-6 py-6 flex items-center gap-4 border-b border-white/10 min-h-[5rem] shrink-0"
    >
        <!-- Desktop Toggle -->
        <button
            onclick="toggleDesktopSidebar()"
            class="hidden lg:flex w-10 h-10 rounded-full hover:bg-white/10 items-center justify-center transition shrink-0"
            title="Collapse menu"
        >
            <i
                id="sidebar-toggle-icon"
                class="fas fa-bars text-xl text-white"
            ></i>
        </button>
        <!-- Mobile Close -->
        <button
            onclick="toggleSidebar()"
            class="lg:hidden w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition shrink-0"
            title="Close menu"
        >
            <i class="fas fa-bars text-xl text-white"></i>
        </button>

        <!-- School Logo -->
        <img
            src="{{ asset('img/logo.png') }}"
            class="w-10 h-10 object-contain drop-shadow-lg animate-float"
        />

        <div class="sidebar-text flex-1 overflow-hidden whitespace-nowrap">
            <h1 class="text-lg font-bold tracking-wide leading-tight">
                CNHS AI
            </h1>
            <p class="text-[10px] text-white/60 font-medium uppercase tracking-widest">Student System</p>
        </div>
    </div>

    <div class="flex-1 overflow-y-auto w-full">
        <!-- ROLE TAG -->
        <div class="px-6 py-3">
            <span
                id="role-tag"
                class="sidebar-text text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/70"
                >GUEST</span
            >
        </div>

        <!-- NAVIGATION MENU -->
        <nav class="flex-1 px-3 py-2 space-y-1">
            <button
                onclick="navigate('dashboard')"
                id="nav-dashboard"
                class="sidebar-item w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
            >
                <i
                    class="fas fa-th-large w-5 text-center text-lg opacity-80 group-hover:text-accent transition-colors"
                ></i>
                <span class="sidebar-text">Dashboard</span>
            </button>

            <button
                onclick="navigate('add-student')"
                id="nav-add-student"
                class="sidebar-item hidden w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
            >
                <i
                    class="fas fa-user-plus w-5 text-center text-lg opacity-80 group-hover:text-accent transition-colors"
                ></i>
                <span class="sidebar-text">Add Students</span>
            </button>

            <button
                onclick="navigate('records')"
                id="nav-records"
                class="sidebar-item w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
            >
                <i
                    class="fas fa-table w-5 text-center text-lg opacity-80 group-hover:text-accent transition-colors"
                ></i>
                <span class="sidebar-text">Grading Records</span>
            </button>

            <button
                onclick="navigate('adviser')"
                id="nav-adviser"
                class="sidebar-item hidden w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
            >
                <i
                    class="fas fa-chalkboard w-5 text-center text-lg opacity-80 group-hover:text-accent transition-colors"
                ></i>
                <span class="sidebar-text">Advisory Class</span>
            </button>

            {{-- Admin-only items --}}
            <button
                onclick="navigate('manage-teachers')"
                id="nav-manage-teachers"
                class="sidebar-item hidden w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
            >
                <i
                    class="fas fa-chalkboard-teacher w-5 text-center text-lg opacity-80 group-hover:text-accent transition-colors"
                ></i>
                <span class="sidebar-text">Manage Teachers</span>
            </button>

            <button
                onclick="navigate('subjects')"
                id="nav-subjects"
                class="sidebar-item hidden w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
            >
                <i
                    class="fas fa-book-open w-5 text-center text-lg opacity-80 group-hover:text-accent transition-colors"
                ></i>
                <span class="sidebar-text">Subjects</span>
            </button>

            <button
                onclick="navigate('assign-section')"
                id="nav-assign-section"
                class="sidebar-item hidden w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
            >
                <i
                    class="fas fa-layer-group w-5 text-center text-lg opacity-80 group-hover:text-accent transition-colors"
                ></i>
                <span class="sidebar-text">Assign Section</span>
            </button>

            <button
                onclick="navigate('logs')"
                id="nav-logs"
                class="sidebar-item hidden w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
            >
                <i
                    class="fas fa-clipboard-list w-5 text-center text-lg opacity-80 group-hover:text-accent transition-colors"
                ></i>
                <span class="sidebar-text">Activity Logs</span>
            </button>

            <!-- New Realistic Admin Items -->

            <button
                onclick="navigate('settings')"
                id="nav-settings"
                class="sidebar-item w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 group"
            >
                <i
                    class="fas fa-cog w-5 text-center text-lg opacity-80 group-hover:text-accent transition-colors"
                ></i>
                <span class="sidebar-text">Settings</span>
            </button>

            <button
                onclick="navigate('maintenance')"
                id="nav-maintenance"
                class="sidebar-item hidden w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 group"
            >
                <i
                    class="fas fa-tools w-5 text-center text-lg opacity-80 group-hover:text-accent transition-colors"
                ></i>
                <span class="sidebar-text">Maintenance</span>
            </button>
        </nav>

        <!-- BOTTOM: QR VIEWER & LOGOUT -->
        <div class="p-4 space-y-2 border-t border-white/10">
            <button
                onclick="
                    document
                        .getElementById('qr-scan-modal')
                        .classList.remove('hidden')
                "
                class="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
                <i class="fas fa-qrcode w-5 text-center text-lg opacity-80"></i>
                <span class="sidebar-text">Scan Student QR</span>
            </button>
            <button
                onclick="logout()"
                class="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-red-300 hover:text-white hover:bg-red-500/40 transition-all"
            >
                <i
                    class="fas fa-sign-out-alt w-5 text-center text-lg opacity-80"
                ></i>
                <span class="sidebar-text">Logout</span>
            </button>
        </div>
    </div>
</aside>
