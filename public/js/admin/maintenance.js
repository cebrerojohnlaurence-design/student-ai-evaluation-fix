/**
 * admin/maintenance.js — System Maintenance Features
 */

async function saveSettingsData(settingsObj, successMessage) {
    try {
        const res = await fetch('/api/maintenance/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
            },
            body: JSON.stringify(settingsObj)
        });
        const data = await res.json();
        if (data.success) {
            globalSettings = { ...globalSettings, ...settingsObj };
            triggerMockSuccess(successMessage || 'Settings saved successfully!');
        }
    } catch (e) {
        console.error('Failed to save settings', e);
        triggerMockSuccess('Error saving settings', 'bg-red-500');
    }
}

async function renderMaintenance(container) {
    await fetchSettings();
    
    if (currentUser.role !== 'admin' && currentUser.role !== 'principal' && currentUser.role !== 'curriculum_coordinator') {
        container.innerHTML = `<div class="p-8 text-red-500 font-bold text-center">Unauthorized Access</div>`;
        return;
    }

    container.innerHTML = `
        <div class="animate-fade-in h-full flex flex-col p-2 sm:p-4 max-w-7xl mx-auto w-full">
            <div class="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 class="text-3xl font-black tracking-tight text-gray-900 drop-shadow-sm flex items-center gap-3">
                        <i class="fas fa-server text-primary"></i> System Maintenance
                    </h2>
                    <p class="text-sm text-gray-500 mt-2 italic font-medium">Control center for system configurations, branding, and advanced operations.</p>
                </div>
            </div>

            <div class="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-[600px]">
                
                <!-- SIDEBAR NAV -->
                <div class="w-full lg:w-72 shrink-0 flex flex-col gap-2">
                    ${(currentUser.role === 'admin' || currentUser.role === 'principal') ? `
                    <button onclick="switchMaintenanceTab('branding')" id="mtab-branding" class="mtab-btn w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all duration-300 font-bold bg-white shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md text-gray-600 group relative overflow-hidden">
                        <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <i class="fas fa-paint-brush"></i>
                        </div>
                        <span class="z-10 relative">Branding & Assets</span>
                        <div class="active-indicator absolute inset-0 bg-gradient-to-r from-indigo-50 to-transparent opacity-0 transition-opacity"></div>
                    </button>

                    <button onclick="switchMaintenanceTab('login')" id="mtab-login" class="mtab-btn w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all duration-300 font-bold bg-white shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md text-gray-600 group relative overflow-hidden">
                        <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <i class="fas fa-sign-in-alt"></i>
                        </div>
                        <span class="z-10 relative">Login Layout</span>
                        <div class="active-indicator absolute inset-0 bg-gradient-to-r from-emerald-50 to-transparent opacity-0 transition-opacity"></div>
                    </button>

                    <button onclick="switchMaintenanceTab('prefs')" id="mtab-prefs" class="mtab-btn w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all duration-300 font-bold bg-white shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md text-gray-600 group relative overflow-hidden">
                        <div class="w-10 h-10 rounded-xl bg-fuchsia-50 text-fuchsia-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <i class="fas fa-sliders-h"></i>
                        </div>
                        <span class="z-10 relative">System Prefs</span>
                        <div class="active-indicator absolute inset-0 bg-gradient-to-r from-fuchsia-50 to-transparent opacity-0 transition-opacity"></div>
                    </button>
                    ` : ''}

                    <button onclick="switchMaintenanceTab('academic')" id="mtab-academic" class="mtab-btn w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all duration-300 font-bold bg-white shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md text-gray-600 group relative overflow-hidden">
                        <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <span class="z-10 relative">Academic Config</span>
                        <div class="active-indicator absolute inset-0 bg-gradient-to-r from-amber-50 to-transparent opacity-0 transition-opacity"></div>
                    </button>
                    <button onclick="switchMaintenanceTab('lists')" id="mtab-lists" class="mtab-btn w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all duration-300 font-bold bg-white shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md text-gray-600 group relative overflow-hidden">
                        <div class="w-10 h-10 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <i class="fas fa-tags"></i>
                        </div>
                        <span class="z-10 relative">Lists & Categories</span>
                        <div class="active-indicator absolute inset-0 bg-gradient-to-r from-pink-50 to-transparent opacity-0 transition-opacity"></div>
                    </button>
                </div>

                <!-- MAIN CONTENT PANEL -->
                <div class="flex-1 bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white shadow-xl shadow-gray-200/50 flex flex-col overflow-hidden relative">
                    <!-- Background aesthetic blur -->
                    <div class="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div id="maintenance-content-area" class="flex-1 p-8 overflow-y-auto relative z-10 custom-scrollbar transition-all duration-300">
                        <!-- Dynamic content injected here -->
                    </div>
                </div>

            </div>
        </div>
    `;

    // Load initial tab
    if (currentUser.role === 'curriculum_coordinator') {
        switchMaintenanceTab('academic');
    } else {
        switchMaintenanceTab('branding');
    }
}

function switchMaintenanceTab(tabId) {
    const area = document.getElementById('maintenance-content-area');
    
    // Update active state on buttons
    document.querySelectorAll('.mtab-btn').forEach(btn => {
        btn.classList.remove('border-primary', 'shadow-md', 'ring-2', 'ring-primary/20', 'bg-gradient-to-br');
        btn.querySelector('.active-indicator').classList.remove('opacity-100');
        
        if (btn.id === 'mtab-security') {
            btn.classList.remove('border-red-500', 'ring-red-500/20');
        }
    });

    const activeBtn = document.getElementById(`mtab-${tabId}`);
    if (activeBtn) {
        if (tabId === 'security') {
            activeBtn.classList.add('border-red-500', 'shadow-md', 'ring-2', 'ring-red-500/20', 'bg-white');
        } else {
            activeBtn.classList.add('border-primary', 'shadow-md', 'ring-2', 'ring-primary/20', 'bg-white');
        }
        activeBtn.querySelector('.active-indicator').classList.add('opacity-100');
    }

    // Fade out effect
    area.style.opacity = '0';
    area.style.transform = 'translateY(10px)';

    setTimeout(() => {
        area.innerHTML = getMaintenanceTabContent(tabId);
        
        // Fade in effect
        area.style.opacity = '1';
        area.style.transform = 'translateY(0)';
    }, 200);
}

function getMaintenanceTabContent(tabId) {
    if (tabId === 'branding') {
        return `
            <div class="max-w-2xl">
                <div class="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl shadow-inner"><i class="fas fa-paint-brush"></i></div>
                    <div>
                        <h3 class="text-2xl font-black text-gray-800 tracking-tight">System Logo & Branding</h3>
                        <p class="text-sm text-gray-500 font-medium">Update the primary logo displayed across dashboards.</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden group hover:border-indigo-200 transition-colors">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
                    
                    <div class="flex flex-col items-center">
                        <div class="relative mb-6">
                            <div class="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[2rem] blur opacity-20"></div>
                            <img id="logo-preview" src="/img/logo.png" onerror="this.src='https://ui-avatars.com/api/?name=Logo'" class="relative w-40 h-40 object-contain bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100 z-10 transition-transform hover:scale-105" />
                        </div>
                        
                        <label for="logo-upload-input" class="cursor-pointer bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-3">
                            <i class="fas fa-cloud-upload-alt text-lg"></i> Select Image
                        </label>
                        <input type="file" id="logo-upload-input" accept="image/*" class="hidden" onchange="previewMaintenanceImage(this, 'logo-preview')" />
                        <p class="text-xs text-gray-400 mt-4 font-medium"><i class="fas fa-info-circle"></i> Recommended: Square PNG, transparent background, max 2MB.</p>
                    </div>

                    <div class="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                        <button onclick="uploadMaintenanceLogo()" id="btn-save-logo" class="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg flex items-center gap-2">
                            <i class="fas fa-check-circle"></i> Apply Logo Change
                        </button>
                    </div>
                </div>
            </div>
        `;
    } 
    else if (tabId === 'login') {
        return `
            <div class="max-w-3xl">
                <div class="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl shadow-inner"><i class="fas fa-sign-in-alt"></i></div>
                    <div>
                        <h3 class="text-2xl font-black text-gray-800 tracking-tight">Login Portal Layout</h3>
                        <p class="text-sm text-gray-500 font-medium">Customize the aesthetic of the main entry point.</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden group hover:border-emerald-200 transition-colors">
                    
                    <label class="block text-sm font-bold text-gray-700 mb-3">Hero Background Image</label>
                    <div class="w-full h-64 rounded-2xl overflow-hidden relative shadow-inner border-4 border-gray-50 group-hover:border-emerald-50 transition-colors mb-6">
                        <img id="bg-preview" src="/img/school.png" onerror="this.src=''" class="w-full h-full object-cover" />
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <label for="bg-upload-input" class="cursor-pointer bg-white/20 backdrop-blur-md text-white border border-white/40 px-6 py-3 rounded-xl font-bold text-sm hover:bg-white/40 transition-all flex items-center gap-2">
                                <i class="fas fa-camera text-lg"></i> Replace Image
                            </label>
                            <input type="file" id="bg-upload-input" accept="image/*" class="hidden" onchange="previewMaintenanceImage(this, 'bg-preview')" />
                        </div>
                    </div>

                    <div class="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                        <button onclick="restoreDefaultBackground()" id="btn-restore-bg" class="px-6 py-3 bg-gray-100 text-gray-600 hover:text-red-600 rounded-xl font-bold text-sm transition-all hover:bg-red-50 flex items-center gap-2">
                            <i class="fas fa-undo-alt"></i> Restore Default
                        </button>
                        
                        <button onclick="uploadMaintenanceBackground()" id="btn-save-bg" class="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-200 hover:bg-emerald-700 hover:shadow-lg flex items-center gap-2">
                            <i class="fas fa-check-circle"></i> Save Background
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    else if (tabId === 'prefs') {
        const appName = globalSettings['app_name'] || 'CNHS AI Student System';
        const contactPhone = globalSettings['contact_phone'] || '(055) 123-4567';
        const systemEmail = globalSettings['system_email'] || 'info@cnhs.edu.ph';
        const principalName = globalSettings['principal_name'] || 'John Doe, Ph.D.';

        return `
            <div class="max-w-4xl">
                <div class="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div class="w-12 h-12 rounded-2xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center text-2xl shadow-inner"><i class="fas fa-sliders-h"></i></div>
                    <div>
                        <h3 class="text-2xl font-black text-gray-800 tracking-tight">System Preferences</h3>
                        <p class="text-sm text-gray-500 font-medium">Configure global text variables and official titles.</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"><i class="fas fa-building mr-1"></i> Application Name</label>
                        <input type="text" id="pref-app-name" value="${appName}" class="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20 transition-all">
                    </div>
                    
                    <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"><i class="fas fa-phone mr-1"></i> Contact Phone</label>
                        <input type="text" id="pref-contact-phone" value="${contactPhone}" class="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20 transition-all">
                    </div>

                    <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"><i class="fas fa-envelope mr-1"></i> System Email</label>
                        <input type="text" id="pref-system-email" value="${systemEmail}" class="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20 transition-all">
                    </div>

                    <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"><i class="fas fa-user-tie mr-1"></i> Principal Name</label>
                        <input type="text" id="pref-principal-name" value="${principalName}" class="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20 transition-all">
                    </div>
                </div>

                <div class="flex justify-end pt-8">
                    <button onclick="saveSystemPrefs()" class="px-8 py-3 bg-fuchsia-600 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:bg-fuchsia-700 flex items-center gap-2">
                        <i class="fas fa-save"></i> Save Preferences
                    </button>
                </div>
            </div>
        `;
    }
    else if (tabId === 'lists') {
        setTimeout(initDynamicLists, 100); // Initialize lists after render
        return `
            <div class="max-w-4xl">
                <div class="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div class="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center text-2xl shadow-inner"><i class="fas fa-tags"></i></div>
                    <div>
                        <h3 class="text-2xl font-black text-gray-800 tracking-tight">System Lists & Categories</h3>
                        <p class="text-sm text-gray-500 font-medium">Manage dynamic system taxonomies like departments, statuses, and tracks.</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <!-- Grade Levels -->
                    <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-[280px]">
                        <label class="block text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2"><i class="fas fa-layer-group"></i> Grade Levels</label>
                        <div id="list-grade_levels" class="flex flex-wrap gap-2 mb-4 flex-1 content-start overflow-y-auto custom-scrollbar pr-2">
                            <!-- Tags injected here -->
                        </div>
                        <div class="flex items-center gap-2 mt-auto pt-4 border-t border-gray-50">
                            <input type="text" id="input-grade_levels" placeholder="e.g. Grade 11" class="flex-1 bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm transition-all" onkeypress="handleListEnter(event, 'grade_levels')">
                            <button onclick="addListTag('grade_levels')" class="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-600 flex items-center justify-center transition-colors"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                    




                </div>
            </div>
        `;
    }
    else if (tabId === 'academic') {
        return `
            <div class="max-w-4xl">
                <div class="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl shadow-inner"><i class="fas fa-calendar-alt"></i></div>
                    <div>
                        <h3 class="text-2xl font-black text-gray-800 tracking-tight">Academic Configuration</h3>
                        <p class="text-sm text-gray-500 font-medium">Manage school years, grading periods, and curriculum settings.</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
                        <div class="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10"></div>
                        <div class="flex justify-between items-center mb-4">
                            <label class="block text-xs font-bold text-amber-600 uppercase tracking-widest"><i class="fas fa-history mr-1"></i> Active School Year</label>
                            <div class="flex gap-2">
                                <button onclick="promptNewSchoolYear()" class="text-xs font-bold text-amber-600 hover:text-amber-800 bg-amber-50 px-3 py-1 rounded-lg transition-colors"><i class="fas fa-plus"></i> Add</button>
                                <button onclick="promptDeleteSchoolYear()" class="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1 rounded-lg transition-colors"><i class="fas fa-trash"></i> Delete</button>
                            </div>
                        </div>
                        <select id="active-sy-select" class="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 appearance-none transition-all cursor-pointer">
                            ${(function() {
                                let syList = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
                                if (globalSettings['school_years']) {
                                    try {
                                        let parsed = JSON.parse(globalSettings['school_years']);
                                        if (Array.isArray(parsed) && parsed.length > 0) syList = parsed;
                                    } catch(e){}
                                }
                                let active = globalSettings['active_sy'] || '2025-2026';
                                return syList.map(sy => `<option value="${sy}" ${sy === active ? 'selected' : ''}>S.Y. ${sy}</option>`).join('');
                            })()}
                        </select>
                        <button onclick="saveActiveSchoolYear()" class="mt-4 w-full py-3 bg-amber-100 text-amber-700 font-bold rounded-xl hover:bg-amber-200 transition-colors text-sm">Update S.Y.</button>
                    </div>

                    <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
                        <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10"></div>
                        <div class="flex justify-between items-center mb-4">
                            <label class="block text-xs font-bold text-blue-600 uppercase tracking-widest"><i class="fas fa-clock mr-1"></i> Active Grading Period</label>
                            <div class="flex gap-2">
                                <button onclick="promptNewGradingPeriod()" class="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-lg transition-colors"><i class="fas fa-plus"></i> Add</button>
                                <button onclick="promptDeleteGradingPeriod()" class="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1 rounded-lg transition-colors"><i class="fas fa-trash"></i> Delete</button>
                            </div>
                        </div>
                        <select id="active-gp-select" class="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 appearance-none transition-all cursor-pointer">
                            ${(function() {
                                let gpList = ['1', '2', '3', '4'];
                                if (globalSettings['grading_periods']) {
                                    try {
                                        let parsed = JSON.parse(globalSettings['grading_periods']);
                                        if (Array.isArray(parsed) && parsed.length > 0) gpList = parsed;
                                    } catch(e){}
                                }
                                let active = globalSettings['active_gp'] || '1';
                                return gpList.map(gp => `<option value="${gp}" ${gp === active ? 'selected' : ''}>${gp}${gp == 1 ? 'st' : gp == 2 ? 'nd' : gp == 3 ? 'rd' : 'th'} Quarter</option>`).join('');
                            })()}
                        </select>
                        <button onclick="saveActiveGradingPeriod()" class="mt-4 w-full py-3 bg-blue-100 text-blue-700 font-bold rounded-xl hover:bg-blue-200 transition-colors text-sm">Update Period</button>
                    </div>
                </div>

                <div class="space-y-4">
                    <h4 class="font-bold text-gray-800 text-lg mb-2">Curriculum & Class Settings</h4>
                    
                    <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 text-xl"><i class="fas fa-book-open"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Enrollment Status</h4>
                                <p class="text-xs text-gray-500 mt-1 max-w-sm">Toggle whether the system accepts new student enrollments for the active school year.</p>
                            </div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" value="" checked class="sr-only peer" onchange="triggerMockSuccess(this.checked ? 'Enrollment is now OPEN.' : 'Enrollment is now CLOSED.')">
                            <div class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600 shadow-inner"></div>
                        </label>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl"><i class="fas fa-layer-group"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Senior High School (SHS) Tracks</h4>
                                <p class="text-xs text-gray-500 mt-1 max-w-sm">Enable specialized tracks (Academic, TVL, Sports, Arts) in the curriculum.</p>
                            </div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" value="" checked class="sr-only peer" onchange="triggerMockSuccess(this.checked ? 'SHS Tracks Enabled.' : 'SHS Tracks Disabled.')">
                            <div class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                        </label>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 text-xl"><i class="fas fa-users-slash"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Class Size Limit</h4>
                                <p class="text-xs text-gray-500 mt-1 max-w-sm">Set the maximum number of students allowed per section to prevent overcrowding.</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="number" value="45" class="w-20 bg-gray-50 border border-gray-200 text-gray-800 font-bold py-2 px-3 rounded-xl outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 text-center transition-all">
                            <button onclick="triggerMockSuccess('Class size limit updated!')" class="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 transition-all">Save</button>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl"><i class="fas fa-calculator"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Grading Formula Configuration</h4>
                                <p class="text-xs text-gray-500 mt-1 max-w-sm">Adjust DepEd standard weights for Written Works, Performance Tasks, and Quarterly Assessments.</p>
                            </div>
                        </div>
                        <button onclick="triggerMockSuccess('Grading Formula Editor Opened')" class="px-5 py-2.5 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-2 border border-emerald-200">
                            <i class="fas fa-edit"></i> Edit Formula
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    else if (tabId === 'data') {
        return `
            <div class="max-w-3xl">
                <div class="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl shadow-inner"><i class="fas fa-database"></i></div>
                    <div>
                        <h3 class="text-2xl font-black text-gray-800 tracking-tight">Data Management</h3>
                        <p class="text-sm text-gray-500 font-medium">Backup, restore, and optimize system data.</p>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between hover:border-blue-200 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-xl"><i class="fas fa-hdd"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Database Backup</h4>
                                <p class="text-xs text-gray-500 mt-0.5">Generate a complete SQL dump of current records.</p>
                            </div>
                        </div>
                        <button onclick="triggerMockAction(this, 'Generating backup...', 'Backup Database.sql downloaded!', 'fa-download', 'bg-blue-600', 'text-white')" class="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-md transition-all flex items-center gap-2 w-40 justify-center">
                            <i class="fas fa-download"></i> Backup Now
                        </button>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 text-xl"><i class="fas fa-file-export"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Export All Data (CSV)</h4>
                                <p class="text-xs text-gray-500 mt-0.5">Export all student records and grades to CSV.</p>
                            </div>
                        </div>
                        <button onclick="triggerMockAction(this, 'Exporting data...', 'Students_Data.csv exported successfully!', 'fa-file-excel', 'bg-emerald-600', 'text-white')" class="px-5 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2 w-40 justify-center">
                            <i class="fas fa-file-export"></i> Export CSV
                        </button>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between hover:border-amber-200 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 text-xl"><i class="fas fa-archive"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Archive Old Records</h4>
                                <p class="text-xs text-gray-500 mt-0.5">Move old school year data to cold storage for speed.</p>
                            </div>
                        </div>
                        <button onclick="triggerMockAction(this, 'Archiving...', 'Old records archived successfully!', 'fa-archive', 'bg-amber-500', 'text-white')" class="px-5 py-2.5 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600 shadow-md transition-all flex items-center gap-2 w-40 justify-center">
                            <i class="fas fa-archive"></i> Archive Data
                        </button>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between hover:border-purple-200 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 text-xl"><i class="fas fa-broom"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Clear System Cache</h4>
                                <p class="text-xs text-gray-500 mt-0.5">Flush view caches and temporary session data.</p>
                            </div>
                        </div>
                        <button onclick="triggerMockAction(this, 'Clearing cache...', 'System cache cleared successfully!', 'fa-broom')" class="px-5 py-2.5 bg-gray-100 text-gray-700 border border-gray-200 font-bold text-sm rounded-xl hover:bg-white hover:text-purple-600 hover:border-purple-300 transition-all flex items-center gap-2 w-40 justify-center">
                            <i class="fas fa-broom"></i> Clear Cache
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    else if (tabId === 'health') {
        return `
            <div class="max-w-3xl">
                <div class="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div class="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center text-2xl shadow-inner"><i class="fas fa-heartbeat"></i></div>
                    <div>
                        <h3 class="text-2xl font-black text-gray-800 tracking-tight">System Health</h3>
                        <p class="text-sm text-gray-500 font-medium">Real-time metrics and environment information.</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center relative overflow-hidden">
                        <div class="absolute bottom-0 left-0 w-full h-1 bg-teal-500"></div>
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                        <h4 class="text-xl font-black text-teal-600">ONLINE</h4>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center relative overflow-hidden">
                        <div class="absolute bottom-0 left-0 w-full h-1 bg-blue-500"></div>
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">CPU Load</p>
                        <h4 class="text-xl font-black text-gray-800">12.4%</h4>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center relative overflow-hidden">
                        <div class="absolute bottom-0 left-0 w-full h-1 bg-purple-500"></div>
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Memory</p>
                        <h4 class="text-xl font-black text-gray-800">1.2 GB</h4>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center relative overflow-hidden">
                        <div class="absolute bottom-0 left-0 w-full h-1 bg-amber-500"></div>
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Uptime</p>
                        <h4 class="text-xl font-black text-gray-800">14 Days</h4>
                    </div>
                </div>

                <div class="bg-gray-900 rounded-3xl p-6 text-gray-300 font-mono text-sm shadow-xl relative overflow-hidden border border-gray-800">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-gray-800 rounded-full blur-3xl -z-10"></div>
                    <h4 class="text-white font-bold mb-4 font-sans border-b border-gray-800 pb-2"><i class="fas fa-terminal text-teal-400 mr-2"></i> Environment Details</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between"><span class="text-gray-500">PHP Version</span><span class="text-teal-400">8.2.10</span></div>
                        <div class="flex justify-between"><span class="text-gray-500">Laravel Version</span><span class="text-red-400">10.x</span></div>
                        <div class="flex justify-between"><span class="text-gray-500">Database</span><span class="text-blue-400">MySQL 8.0</span></div>
                        <div class="flex justify-between"><span class="text-gray-500">Environment</span><span class="text-amber-400">Production</span></div>
                        <div class="flex justify-between"><span class="text-gray-500">Server OS</span><span class="text-purple-400">Linux Ubuntu 22.04</span></div>
                    </div>
                </div>
            </div>
        `;
    }
    else if (tabId === 'security') {
        return `
            <div class="max-w-3xl">
                <div class="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div class="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl shadow-inner"><i class="fas fa-shield-alt"></i></div>
                    <div>
                        <h3 class="text-2xl font-black text-gray-800 tracking-tight">Security & Access Control</h3>
                        <p class="text-sm text-gray-500 font-medium">Critical system operations. Use with extreme caution.</p>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xl"><i class="fas fa-user-lock"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Two-Factor Authentication (2FA)</h4>
                                <p class="text-xs text-gray-500 mt-1 max-w-sm">Require staff to enter an OTP sent to their email when logging in.</p>
                            </div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" value="" class="sr-only peer" onchange="triggerMockSuccess(this.checked ? '2FA is now Required for Staff!' : '2FA requirement disabled.')">
                            <div class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                        </label>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xl"><i class="fas fa-clock"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Session Timeout</h4>
                                <p class="text-xs text-gray-500 mt-1 max-w-sm">Automatically log out users after a period of inactivity.</p>
                            </div>
                        </div>
                        <select onchange="triggerMockSuccess('Session timeout policy updated!')" class="w-40 bg-gray-50 border border-gray-200 text-gray-800 font-bold py-2 px-3 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer">
                            <option value="15">15 Minutes</option>
                            <option value="30" selected>30 Minutes</option>
                            <option value="60">1 Hour</option>
                            <option value="never">Never Timeout</option>
                        </select>
                    </div>

                    <div class="bg-red-50/50 rounded-2xl p-5 border border-red-100 flex items-center justify-between">
                        <div>
                            <h4 class="font-bold text-red-900"><i class="fas fa-tools mr-2 text-red-500"></i> Maintenance Mode</h4>
                            <p class="text-xs text-red-700/70 mt-1 max-w-sm">Disable access to the system for all users except administrators. Used during upgrades.</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" value="" class="sr-only peer" onchange="triggerMockSuccess(this.checked ? 'System is now in Maintenance Mode!' : 'System is now Live!')">
                            <div class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600 shadow-inner"></div>
                        </label>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <h4 class="font-bold text-gray-800">Force Logout All Users</h4>
                            <p class="text-xs text-gray-500 mt-1 max-w-sm">Invalidate all active sessions immediately. Everyone will need to log back in.</p>
                        </div>
                        <button onclick="triggerMockAction(this, 'Logging out users...', 'All active sessions destroyed!', 'fa-sign-out-alt', 'bg-red-600', 'text-white')" class="px-5 py-2.5 bg-white text-red-600 border border-red-200 font-bold text-sm rounded-xl hover:bg-red-50 transition-all flex items-center gap-2 w-48 justify-center">
                            <i class="fas fa-sign-out-alt"></i> Execute Logout
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    else if (tabId === 'email') {
        return `
            <div class="max-w-2xl">
                <div class="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div class="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl shadow-inner"><i class="fas fa-envelope"></i></div>
                    <div>
                        <h3 class="text-2xl font-black text-gray-800 tracking-tight">Email Settings (SMTP)</h3>
                        <p class="text-sm text-gray-500 font-medium">Configure outgoing mail server for system notifications.</p>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">SMTP Host</label>
                        <input type="text" value="smtp.mailtrap.io" class="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">SMTP Port</label>
                            <input type="number" value="2525" class="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all">
                        </div>
                        <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Encryption</label>
                            <select class="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all cursor-pointer">
                                <option value="tls" selected>TLS</option>
                                <option value="ssl">SSL</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Username</label>
                            <input type="text" value="system_mailer" class="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all">
                        </div>
                        <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Password</label>
                            <input type="password" value="********" class="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all">
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-4">
                        <button onclick="triggerMockAction(this, 'Testing connection...', 'Test email sent successfully!', 'fa-paper-plane', 'bg-gray-800', 'text-white')" class="px-6 py-3 bg-gray-100 text-gray-700 border border-gray-200 font-bold text-sm rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2">
                            <i class="fas fa-vial"></i> Test Connection
                        </button>
                        <button onclick="triggerMockSuccess('SMTP settings saved successfully!')" class="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:bg-orange-600 flex items-center gap-2">
                            <i class="fas fa-save"></i> Save Settings
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    else if (tabId === 'integrations') {
        return `
            <div class="max-w-3xl">
                <div class="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div class="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center text-2xl shadow-inner"><i class="fas fa-plug"></i></div>
                    <div>
                        <h3 class="text-2xl font-black text-gray-800 tracking-tight">System Integrations</h3>
                        <p class="text-sm text-gray-500 font-medium">Manage API keys and external service connections.</p>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between hover:border-cyan-200 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-xl"><i class="fas fa-sms"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Twilio SMS Gateway</h4>
                                <p class="text-xs text-gray-500 mt-0.5">Used for sending OTPs and emergency alerts via SMS.</p>
                            </div>
                        </div>
                        <button onclick="triggerMockSuccess('Twilio Configuration Opened')" class="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2">
                            <i class="fas fa-cog"></i> Configure
                        </button>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between hover:border-cyan-200 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 text-xl"><i class="fab fa-google-drive"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Google Drive Storage</h4>
                                <p class="text-xs text-gray-500 mt-0.5">Automated remote backup storage and file syncing.</p>
                            </div>
                        </div>
                        <button onclick="triggerMockAction(this, 'Connecting...', 'Google Drive Connected Successfully!', 'fa-check', 'bg-green-500', 'text-white')" class="px-5 py-2.5 bg-white border border-green-500 text-green-600 font-bold text-sm rounded-xl hover:bg-green-50 transition-all flex items-center gap-2">
                            <i class="fas fa-link"></i> Connect Account
                        </button>
                    </div>
                    
                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between hover:border-cyan-200 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 text-xl"><i class="fas fa-brain"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800">Gemini AI API</h4>
                                <p class="text-xs text-gray-500 mt-0.5">Credentials for document scanning and AI analytics.</p>
                            </div>
                        </div>
                        <button onclick="triggerMockSuccess('Gemini API Key Settings Opened')" class="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2">
                            <i class="fas fa-key"></i> API Keys
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// -------------------------------------------------------------
// LOGIC FUNCTIONS
// -------------------------------------------------------------

function previewMaintenanceImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(previewId).src = e.target.result;
            input.dataset.base64 = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

async function uploadMaintenanceLogo() {
    const input = document.getElementById('logo-upload-input');
    const base64Data = input.dataset.base64;
    
    if (!base64Data) {
        showPremiumToast('warning', 'Please select a new logo image first.');
        return;
    }

    const btn = document.getElementById('btn-save-logo');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Applying...';

    try {
        const res = await fetch('/api/maintenance/upload-logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ logo: base64Data })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload logo');
        
        showPremiumToast('success', 'Logo successfully updated system-wide!');
        
        // Update sidebar logo dynamically if it exists
        const sidebarLogo = document.querySelector('.sidebar-text').previousElementSibling;
        if(sidebarLogo && sidebarLogo.tagName === 'IMG') sidebarLogo.src = base64Data;

    } catch (err) {
        showPremiumToast('error', err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Apply Logo Change';
    }
}

async function uploadMaintenanceBackground() {
    const input = document.getElementById('bg-upload-input');
    const base64Data = input.dataset.base64;
    
    if (!base64Data) {
        showPremiumToast('warning', 'Please select a new background image first.');
        return;
    }

    const btn = document.getElementById('btn-save-bg');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving...';

    try {
        const res = await fetch('/api/maintenance/upload-login-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ background: base64Data })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload background');
        
        showPremiumToast('success', 'Login background successfully updated!');
    } catch (err) {
        showPremiumToast('error', err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Save Background';
    }
}

async function restoreDefaultBackground() {
    const btn = document.getElementById('btn-restore-bg');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Restoring...';

    try {
        const res = await fetch('/api/maintenance/restore-default-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Backup not found.');
        
        showPremiumToast('success', 'Default background restored successfully!');
        
        // Refresh preview
        document.getElementById('bg-preview').src = '/img/school.png?t=' + new Date().getTime();
        document.getElementById('bg-upload-input').dataset.base64 = '';
        
    } catch (err) {
        showPremiumToast('error', err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-undo-alt"></i> Restore Default';
    }
}

// -------------------------------------------------------------
// ==========================================
// DYNAMIC LISTS LOGIC
// ==========================================

let systemListsData = {
    grade_levels: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
};

function initDynamicLists() {
    // Override with global settings if available
    if (globalSettings.system_lists) {
        try {
            const parsed = JSON.parse(globalSettings.system_lists);
            systemListsData = { ...systemListsData, ...parsed };
        } catch (e) {}
    }

    renderListTags('grade_levels');
    renderListTags('grade_levels');
}

function renderListTags(listId) {
    const container = document.getElementById(`list-${listId}`);
    if (!container) return;
    
    container.innerHTML = '';
    const items = systemListsData[listId] || [];
    
    items.forEach((item, index) => {
        if (listId === 'grade_levels' && currentUser.role === 'curriculum_coordinator') {
            const num = parseInt((item.match(/\d+/) || [0])[0]);
            if (currentUser.department === 'JHS' && (num > 10 || num === 0)) return;
            if (currentUser.department === 'SHS' && (num <= 10 && num > 0)) return;
        }

        const tag = document.createElement('div');
        tag.className = 'flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 group hover:border-gray-300 transition-colors shadow-sm';
        tag.innerHTML = `
            <span><i class="fas fa-grip-vertical text-gray-300 mr-1 text-[10px]"></i> ${item}</span>
            <button onclick="removeListTag('${listId}', ${index})" class="w-5 h-5 rounded-full hover:bg-red-100 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors ml-1">
                <i class="fas fa-times text-[10px]"></i>
            </button>
        `;
        container.appendChild(tag);
    });
}

function handleListEnter(event, listId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addListTag(listId);
    }
}

function addListTag(listId) {
    const input = document.getElementById(`input-${listId}`);
    if (!input) return;
    
    const val = input.value.trim();
    if (val && !systemListsData[listId].includes(val)) {
        if (listId === 'grade_levels' && currentUser.role === 'curriculum_coordinator') {
            const num = parseInt((val.match(/\d+/) || [0])[0]);
            if (currentUser.department === 'JHS' && (num > 10 || num === 0)) {
                triggerMockError('JHS Coordinators can only manage Grades 7-10.');
                return;
            }
            if (currentUser.department === 'SHS' && (num <= 10 && num > 0)) {
                triggerMockError('SHS Coordinators can only manage Grades 11-12.');
                return;
            }
        }
        systemListsData[listId].push(val);
        input.value = '';
        renderListTags(listId);
        triggerMockSuccess(`Added '${val}' successfully!`);
        saveSettingsData({ system_lists: JSON.stringify(systemListsData) }, false);
    } else if (systemListsData[listId].includes(val)) {
        triggerMockError(`'${val}' already exists!`);
    }
}

function removeListTag(listId, index) {
    const item = systemListsData[listId][index];
    systemListsData[listId].splice(index, 1);
    renderListTags(listId);
    triggerMockSuccess(`Removed '${item}' successfully!`);
    saveSettingsData({ system_lists: JSON.stringify(systemListsData) }, false);
}

// -------------------------------------------------------------
// MOCK ACTIONS & PREMIUM TOAST
// -------------------------------------------------------------

function triggerMockSuccess(message) {
    showPremiumToast('success', message);
}

function triggerMockError(message) {
    showPremiumToast('error', message);
}

function triggerMockAction(btn, loadingText, successText, iconClass, finalBgClass = 'bg-blue-600', finalTxtClass = 'text-white') {
    const originalHtml = btn.innerHTML;
    const originalClasses = btn.className;
    
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${loadingText}`;
    
    setTimeout(() => {
        showPremiumToast('success', successText);
        btn.disabled = false;
        btn.innerHTML = `<i class="fas ${iconClass}"></i> Completed`;
        
        // Temporarily style as success
        btn.className = `px-5 py-2.5 ${finalBgClass} ${finalTxtClass} font-bold text-sm rounded-xl transition-all flex items-center gap-2 w-48 justify-center shadow-lg`;
        
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.className = originalClasses;
        }, 2500);
        
    }, 1500);
}

function showPremiumToast(type, message) {
    // Remove existing toast if any
    const existing = document.getElementById('premium-toast');
    if (existing) existing.remove();

    const icons = {
        success: '<div class="w-8 h-8 rounded-full bg-green-100 text-green-500 flex items-center justify-center"><i class="fas fa-check"></i></div>',
        error: '<div class="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center"><i class="fas fa-exclamation-triangle"></i></div>',
        warning: '<div class="w-8 h-8 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center"><i class="fas fa-info"></i></div>'
    };

    const toast = document.createElement('div');
    toast.id = 'premium-toast';
    toast.className = `fixed bottom-8 right-8 z-[100] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-gray-100 p-4 flex items-center gap-4 transform translate-y-20 opacity-0 transition-all duration-300`;
    
    toast.innerHTML = `
        ${icons[type]}
        <div>
            <h5 class="text-sm font-bold text-gray-800">${type.charAt(0).toUpperCase() + type.slice(1)}</h5>
            <p class="text-xs text-gray-500">${message}</p>
        </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    });

    // Animate out
    setTimeout(() => {
        toast.style.transform = 'translateY(20px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function promptNewSchoolYear() {
    const newYear = prompt("Enter new School Year (Format: YYYY-YYYY):", "2027-2028");
    
    if (newYear) {
        // Basic validation
        if (!/^\d{4}-\d{4}$/.test(newYear)) {
            showPremiumToast('error', 'Invalid format. Please use YYYY-YYYY.');
            return;
        }

        const select = document.getElementById('active-sy-select');
        
        // Check if already exists
        let exists = false;
        Array.from(select.options).forEach(opt => {
            if (opt.value === newYear) exists = true;
        });

        if (exists) {
            showPremiumToast('warning', 'School year already exists.');
            return;
        }

        // Add new option and select it
        const option = document.createElement('option');
        option.value = newYear;
        option.text = `S.Y. ${newYear}`;
        select.add(option);
        select.value = newYear;
        
        const globalSelect = document.getElementById('global-school-year');
        if (globalSelect) {
            let globalExists = Array.from(globalSelect.options).some(o => o.value === newYear);
            if (!globalExists) {
                const globalOption = document.createElement('option');
                globalOption.value = newYear;
                globalOption.text = `S.Y. ${newYear}`;
                globalSelect.add(globalOption);
            }
        }

        let schoolYears = [];
        Array.from(select.options).forEach(opt => schoolYears.push(opt.value));
        
        saveSettingsData({ school_years: JSON.stringify(schoolYears) }, `S.Y. ${newYear} added successfully!`);
    }
}

function promptDeleteSchoolYear() {
    const select = document.getElementById('active-sy-select');
    if (select.options.length <= 1) {
        showPremiumToast('error', 'Cannot delete the only remaining school year.');
        return;
    }
    
    const yearToDelete = select.value;
    if (confirm(`Are you sure you want to delete S.Y. ${yearToDelete}?`)) {
        // Remove from local select
        const option = select.options[select.selectedIndex];
        select.removeChild(option);
        
        // Remove from global select
        const globalSelect = document.getElementById('global-school-year');
        if (globalSelect) {
            Array.from(globalSelect.options).forEach(opt => {
                if (opt.value === yearToDelete) {
                    globalSelect.removeChild(opt);
                }
            });
        }
        
        // Save
        let schoolYears = [];
        Array.from(select.options).forEach(opt => schoolYears.push(opt.value));
        
        saveSettingsData({ school_years: JSON.stringify(schoolYears) }, `S.Y. ${yearToDelete} deleted successfully!`);
    }
}

function saveActiveSchoolYear() {
    const sy = document.getElementById('active-sy-select').value;
    saveSettingsData({ active_sy: sy }, 'School Year updated successfully!').then(() => {
        const globalSelect = document.getElementById('global-school-year');
        if (globalSelect) {
            globalSelect.value = sy;
            if (typeof setGlobalSchoolYear === 'function') setGlobalSchoolYear(sy);
        }
    });
}

function saveSystemPrefs() {
    const app_name = document.getElementById('pref-app-name').value;
    const contact_phone = document.getElementById('pref-contact-phone').value;
    const system_email = document.getElementById('pref-system-email').value;
    const principal_name = document.getElementById('pref-principal-name').value;
    
    saveSettingsData({ app_name, contact_phone, system_email, principal_name }, 'Preferences saved successfully!').then(() => {
        const sidebarTitle = document.querySelector('.sidebar-text h1');
        if (sidebarTitle) sidebarTitle.textContent = app_name;
    });
}

function promptNewGradingPeriod() {
    const newGP = prompt("Enter new Grading Period number (e.g., 5):", "5");
    if (newGP) {
        if (isNaN(newGP) || newGP < 1) {
            showPremiumToast('error', 'Invalid format. Please enter a positive number.');
            return;
        }

        const select = document.getElementById('active-gp-select');
        let exists = false;
        Array.from(select.options).forEach(opt => {
            if (opt.value === newGP) exists = true;
        });

        if (exists) {
            showPremiumToast('warning', 'Grading period already exists.');
            return;
        }

        const option = document.createElement('option');
        option.value = newGP;
        option.text = newGP + (newGP == 1 ? 'st' : newGP == 2 ? 'nd' : newGP == 3 ? 'rd' : 'th') + ' Quarter';
        select.add(option);
        select.value = newGP;
        
        let gps = [];
        Array.from(select.options).forEach(opt => gps.push(opt.value));
        saveSettingsData({ grading_periods: JSON.stringify(gps) }, `Quarter ${newGP} added successfully!`);
    }
}

function promptDeleteGradingPeriod() {
    const select = document.getElementById('active-gp-select');
    if (select.options.length <= 1) {
        showPremiumToast('error', 'Cannot delete the only remaining grading period.');
        return;
    }
    
    const gpToDelete = select.value;
    if (confirm(`Are you sure you want to delete Quarter ${gpToDelete}?`)) {
        const option = select.options[select.selectedIndex];
        select.removeChild(option);
        
        let gps = [];
        Array.from(select.options).forEach(opt => gps.push(opt.value));
        saveSettingsData({ grading_periods: JSON.stringify(gps) }, `Quarter ${gpToDelete} deleted successfully!`);
    }
}

function saveActiveGradingPeriod() {
    const gp = document.getElementById('active-gp-select').value;
    saveSettingsData({ active_gp: gp }, 'Grading Period updated successfully!');
}
