const fs = require('fs');
let sidebar = fs.readFileSync('resources/views/dash/sidebar.blade.php', 'utf8');

const target = `<span class="sidebar-text">Assign Section</span>
            </button>`;

const replacement = `<span class="sidebar-text">Assign Section</span>
            </button>

            <button
                onclick="navigate('enrollment')"
                id="nav-enrollment"
                class="sidebar-item hidden w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
            >
                <i
                    class="fas fa-user-check w-5 text-center text-lg opacity-80 group-hover:text-accent transition-colors"
                ></i>
                <span class="sidebar-text">SHS Enrollment</span>
            </button>`;

sidebar = sidebar.replace(target, replacement);
sidebar = sidebar.replace(target.replace(/\n/g, '\r\n'), replacement.replace(/\n/g, '\r\n'));

fs.writeFileSync('resources/views/dash/sidebar.blade.php', sidebar);
console.log('Sidebar updated');
