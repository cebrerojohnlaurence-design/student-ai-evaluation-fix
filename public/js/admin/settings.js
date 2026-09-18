/**
 * admin/settings.js — User Settings implementation
 */

function renderSettings(container) {
    if (currentUser.role === 'admin') {
        container.innerHTML = `
            <div class="animate-fade-in max-w-2xl mx-auto">
                <div class="mb-6"><h2 class="text-2xl font-bold text-gray-800 tracking-tight">System Settings</h2><p class="text-sm text-gray-500 mt-1">Global configuration and system preferences.</p></div>
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i class="fas fa-cog text-3xl text-gray-300"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-700 mb-2">Admin Settings Panel</h3>
                    <p class="text-sm text-gray-400">School year configuration, grading periods, and system preferences will be available here in a future update.</p>
                </div>
            </div>
        `;
        return;
    }

    const profilePic = (currentUser.profile_picture && currentUser.profile_picture !== 'null')
        ? currentUser.profile_picture
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'User')}&background=166534&color=ffffff&font-size=0.4`;

    // Teacher View
    container.innerHTML = `
        <div class="animate-fade-in max-w-4xl mx-auto space-y-8">
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 class="text-3xl font-black text-gray-800 tracking-tight">Account Settings</h2>
                    <p class="text-sm text-gray-500 mt-1 italic">Manage your profile and security credentials.</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Sidebar Info Card -->
                <div class="space-y-6">
                    <div class="bg-gradient-to-br from-primary to-primaryDark rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
                        <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                        <div class="relative flex flex-col items-center">
                            <div class="relative group cursor-pointer" onclick="triggerProfileUpload()">
                                <img id="settings-profile-pic" src="${profilePic}" 
                                     class="w-24 h-24 rounded-2xl border-4 border-white/20 shadow-lg mb-4 object-cover">
                                <div class="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center mb-4">
                                    <i class="fas fa-camera text-white text-xl"></i>
                                </div>
                                <input type="file" id="profile-upload-input" class="hidden" accept="image/*" onchange="handleProfileUpload(this)">
                            </div>
                            <h3 class="font-bold text-lg text-center">${currentUser.name}</h3>
                            <p class="text-xs text-white/60 font-medium uppercase tracking-widest mt-1">${currentUser.role}</p>
                            
                            <div class="mt-6 w-full space-y-3 pt-6 border-t border-white/10">
                                <div class="flex justify-between text-[10px] uppercase tracking-wider font-bold">
                                    <span class="text-white/40">Teacher ID</span>
                                    <span class="text-accent">${currentUser.id}</span>
                                </div>
                                <div class="flex justify-between text-[10px] uppercase tracking-wider font-bold">
                                    <span class="text-white/40">Status</span>
                                    <span class="text-green-300">Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Profile Navigation</h4>
                        <nav class="space-y-2">
                            <button onclick="switchSettingsTab('profile')" class="settings-tab-btn active w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-primary bg-primary/5 border border-primary/10 transition-all">
                                <i class="fas fa-user-circle"></i> Profile Overview
                            </button>
                            <button onclick="switchSettingsTab('security')" class="settings-tab-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all">
                                <i class="fas fa-shield-alt"></i> Security & Password
                            </button>
                            <button onclick="switchSettingsTab('qrcode')" class="settings-tab-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all">
                                <i class="fas fa-qrcode"></i> My QR Code
                            </button>
                        </nav>
                    </div>
                </div>

                <!-- Main Content Area -->
                <div class="lg:col-span-2">
                    <div id="settings-tab-content">
                        ${renderProfileTab()}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function triggerProfileUpload() {
    document.getElementById('profile-upload-input').click();
}

async function handleProfileUpload(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const imgElement = document.getElementById('settings-profile-pic');
    const originalSrc = imgElement ? imgElement.src : '';
    if (imgElement) imgElement.style.opacity = '0.5';

    try {
        // Compress client-side and get base64 string directly (avoids all PHP file/MIME issues)
        const base64Data = await compressImageToBase64(file, 400);

        const res = await fetch('/api/teachers/upload-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                id: currentUser.db_id,
                image_base64: base64Data
            })
        });

        const data = await res.json();
        if (!res.ok) {
            const errMsg = data.error ||
                (data.errors ? Object.values(data.errors).flat()[0] : null) ||
                data.message || 'Upload failed.';
            throw new Error(String(errMsg).substring(0, 120));
        }

        // Update UI and session on success
        currentUser.profile_picture = base64Data;
        sessionStorage.setItem('cnhs_session', JSON.stringify(currentUser));

        if (imgElement) { imgElement.src = base64Data; imgElement.style.opacity = '1'; }
        const avatarEl = document.getElementById('user-display-avatar');
        if (avatarEl) avatarEl.src = base64Data;

        showMessage('Profile picture updated successfully!');

    } catch (e) {
        console.error('Profile Upload Error:', e);
        if (imgElement) { imgElement.src = originalSrc; imgElement.style.opacity = '1'; }
        showMessage(String(e.message).substring(0, 120), true);
    }
}

// Compress image and return as JPEG base64 data URL string
function compressImageToBase64(file, maxSize) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                if (width > height) {
                    if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                } else {
                    if (height > maxSize) { width *= maxSize / height; height = maxSize; }
                }
                canvas.width = Math.round(width);
                canvas.height = Math.round(height);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                // Return as JPEG base64 data URL directly
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = () => reject(new Error('Failed to read image.'));
        };
        reader.onerror = () => reject(new Error('File reader error.'));
    });
}

function switchSettingsTab(tab) {
    const btns = document.querySelectorAll('.settings-tab-btn');
    btns.forEach(b => {
        b.classList.remove('active', 'text-primary', 'bg-primary/5', 'border-primary/10');
        b.classList.add('text-gray-500');
    });

    const activeBtn = Array.from(btns).find(b => b.innerText.toLowerCase().includes(tab === 'qrcode' ? 'qr' : tab));
    if (activeBtn) {
        activeBtn.classList.add('active', 'text-primary', 'bg-primary/5', 'border-primary/10');
        activeBtn.classList.remove('text-gray-500');
    }

    const content = document.getElementById('settings-tab-content');
    content.classList.add('opacity-0', 'translate-y-4');

    setTimeout(() => {
        let newContent = '';
        if (tab === 'profile') newContent = renderProfileTab();
        else if (tab === 'security') newContent = renderSecurityTab();
        else if (tab === 'qrcode') newContent = renderQrCodeTab();
        
        content.innerHTML = newContent;
        content.classList.remove('opacity-0', 'translate-y-4');
        content.classList.add('opacity-100', 'translate-y-0', 'transition-all', 'duration-300');
        
        if (tab === 'qrcode') generateTeacherQrCode();
    }, 150);
}

function renderProfileTab() {
    return `
        <div class="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-8">
            <header>
                <h3 class="text-xl font-bold text-gray-800">Profile Overview</h3>
                <p class="text-xs text-gray-400 mt-1">Your assigned subjects and administrative details.</p>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Full Name</label>
                    <div class="flex items-center gap-2">
                        <input type="text" id="profile-fullname" value="${currentUser.name}" class="w-full px-5 py-4 bg-gray-50 rounded-2xl text-sm font-bold text-gray-700 border border-gray-200 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                        <button onclick="saveProfileName()" class="px-5 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition shadow-sm tooltip-trigger" title="Save Name">
                            <i class="fas fa-save"></i>
                        </button>
                    </div>
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Teacher Code</label>
                    <div class="w-full px-5 py-4 bg-gray-50 rounded-2xl text-sm font-bold text-gray-700 border border-transparent">
                        ${currentUser.id}
                    </div>
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Assigned Subjects</label>
                    <div class="flex flex-wrap gap-2 mt-2">
                        ${(currentUser.subject || 'None').split(',').map(s => `
                            <span class="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                                ${s.trim()}
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Advisory Assignment</label>
                    <div class="w-full px-5 py-4 bg-green-50 rounded-2xl text-sm font-bold text-primary border border-primary/10">
                        ${currentUser.isAdviser ? `<i class="fas fa-chalkboard mr-2"></i> ${currentUser.section}` : 'No Section Assigned'}
                    </div>
                </div>
            </div>

            <div class="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4 mt-8">
                <i class="fas fa-info-circle text-blue-500 mt-1"></i>
                <div class="text-xs text-blue-700 leading-relaxed">
                    <p class="font-bold mb-1">Subject Assignment Note</p>
                    If your handled subjects or section assignments are incorrect, please contact the <span class="font-black">School Registrar</span> or <span class="font-black">System Administrator</span> to update your database record.
                </div>
            </div>
        </div>
    `;
}

function renderSecurityTab() {
    return `
        <div class="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-8 animate-fade-in">
            <header>
                <h3 class="text-xl font-bold text-gray-800">Security & Password</h3>
                <p class="text-xs text-gray-400 mt-1">Update your password to keep your account secure.</p>
            </header>

            <form onsubmit="updateTeacherPassword(event)" class="space-y-6 max-w-md">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Current Password</label>
                    <div class="relative">
                        <i class="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                        <input type="password" id="cur-pass" required
                               class="w-full pl-12 pr-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary transition text-sm font-bold" 
                               placeholder="••••••••">
                    </div>
                </div>
                
                <div class="w-full h-px bg-gray-100 my-4"></div>

                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">New Password</label>
                    <div class="relative">
                        <i class="fas fa-key absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                        <input type="password" id="new-pass" required
                               class="w-full pl-12 pr-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary transition text-sm font-bold" 
                               placeholder="Minimum 6 characters">
                    </div>
                </div>

                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Confirm New Password</label>
                    <div class="relative">
                        <i class="fas fa-check-circle absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                        <input type="password" id="conf-pass" required
                               class="w-full pl-12 pr-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary transition text-sm font-bold" 
                               placeholder="Re-type new password">
                    </div>
                </div>

                <div id="password-feedback" class="hidden p-4 rounded-xl text-[11px] font-bold"></div>

                <button type="submit" id="update-pass-btn"
                        class="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primaryDark transition shadow-lg shadow-primary/20 flex items-center justify-center gap-3">
                    <i class="fas fa-save font-normal"></i> Update Security Credentials
                </button>
            </form>
        </div>
    `;
}

async function updateTeacherPassword(e) {
    e.preventDefault();
    const curP = document.getElementById('cur-pass').value;
    const newP = document.getElementById('new-pass').value;
    const confP = document.getElementById('conf-pass').value;
    const btn = document.getElementById('update-pass-btn');
    const feedback = document.getElementById('password-feedback');

    if (newP !== confP) {
        showFeedback("Passwords do not match!", 'bg-red-50 text-red-600 border border-red-100');
        return;
    }
    if (newP.length < 6) {
        showFeedback("New password must be at least 6 characters!", 'bg-red-50 text-red-600 border border-red-100');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    try {
        const res = await fetch('/api/teachers/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                id: currentUser.db_id,
                current_password: curP,
                new_password: newP,
                confirm_password: confP
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Internal Server Error");

        showFeedback("Password updated successfully! Redirecting...", 'bg-green-50 text-primary border border-green-100');
        setTimeout(() => location.reload(), 1500);

    } catch (err) {
        showFeedback(err.message, 'bg-red-50 text-red-600 border border-red-100');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save font-normal"></i> Update Security Credentials';
    }
}

function showFeedback(msg, classes) {
    const feedback = document.getElementById('password-feedback');
    feedback.innerText = msg;
    feedback.className = `p-4 rounded-xl text-[11px] font-bold ${classes}`;
    feedback.classList.remove('hidden');
}

function renderQrCodeTab() {
    return `
        <div class="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-8 animate-fade-in text-center">
            <header>
                <h3 class="text-xl font-bold text-gray-800">My Login QR Code</h3>
                <p class="text-xs text-gray-400 mt-1">Show this QR code at the teacher login page to sign in instantly.</p>
            </header>
            
            <div class="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border border-gray-200 mx-auto w-fit min-w-[250px] shadow-inner mt-4">
                <div id="teacher-qr-container" class="bg-white p-4 rounded-xl shadow-sm mb-6 flex justify-center items-center h-[232px] w-[232px]"></div>
                
                <button onclick="downloadTeacherQrCode()" class="px-6 py-3 bg-action hover:bg-slate-800 text-black rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-md mx-auto">
                    <i class="fas fa-download"></i> Download QR Code
                </button>
                
                <button onclick="openTeacherQrPinModal()" class="mt-4 px-6 py-3 ${currentUser.has_qr_pin ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm border ${currentUser.has_qr_pin ? 'border-primary/20' : 'border-gray-200'} mx-auto w-full">
                    <i class="fas ${currentUser.has_qr_pin ? 'fa-key' : 'fa-lock'}"></i> 
                    ${currentUser.has_qr_pin ? 'Change Security PIN' : 'Set Up Security PIN'}
                </button>
            </div>
            
            <div class="p-5 bg-yellow-50 rounded-2xl border border-yellow-100 flex items-start gap-4 mt-6 text-left">
                <i class="fas fa-exclamation-circle text-yellow-500 mt-0.5 pointer-events-none"></i>
                <div class="text-xs text-yellow-800 leading-relaxed pointer-events-none">
                    <strong class="block mb-1">Security Warning</strong>
                    Keep your QR code secure. Anyone with access to this image can log in as you and modify student grades. Do not share it publicly.
                </div>
            </div>
        </div>
    `;
}

function generateTeacherQrCode() {
    const container = document.getElementById('teacher-qr-container');
    container.innerHTML = '';
    
    // Defer generation slightly to ensure container is fully in DOM and dimensions exist
    setTimeout(() => {
        if (typeof QRCode !== 'undefined') {
            new QRCode(container, {
                text: currentUser.id,
                width: 200,
                height: 200,
                colorDark: "#0f321d",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            container.innerHTML = '<p class="text-red-500 text-sm font-bold">QR Library Offline</p>';
        }
    }, 100);
}

function downloadTeacherQrCode() {
    const container = document.getElementById('teacher-qr-container');
    const canvas = container.querySelector('canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `Teacher_QR_Login_${currentUser.id}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }
}

// --- QR PIN System for Teachers ---
function openTeacherQrPinModal() {
    document.getElementById('teacher-qr-pin-input').value = '';
    document.getElementById('teacher-qr-pin-error').classList.add('hidden');
    document.getElementById('teacher-qr-pin-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('teacher-qr-pin-input').focus(), 100);
}

function closeTeacherQrPinModal() {
    document.getElementById('teacher-qr-pin-modal').classList.add('hidden');
}

async function saveTeacherQrPin() {
    const pin = document.getElementById('teacher-qr-pin-input').value;
    const btn = document.getElementById('teacher-save-pin-btn');
    const err = document.getElementById('teacher-qr-pin-error');
    
    err.classList.add('hidden');
    
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
        err.innerText = "PIN must be exactly 6 numeric digits.";
        err.classList.remove('hidden');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
    
    try {
        const res = await fetch('/api/teachers/setup-qr-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ teacher_id: currentUser.id, pin: pin })
        });
        
        if (!res.ok) throw new Error("Failed to secure QR PIN");
        
        currentUser.has_qr_pin = true;
        sessionStorage.setItem('cnhs_session', JSON.stringify(currentUser));
        
        closeTeacherQrPinModal();
        showMessage("QR Code is now secured with a PIN.");
        
        // Re-render the QR tab so the button changes to "Change PIN"
        switchSettingsTab('qrcode');
        
    } catch(e) {
        err.innerText = e.message;
        err.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Secure QR Code';
    }
}

async function saveProfileName() {
    const newName = document.getElementById('profile-fullname').value.trim();
    if (!newName) return triggerMockError('Name cannot be empty.');
    
    // Update global state
    currentUser.name = newName;
    
    // Save to localStorage session
    const userSession = JSON.parse(sessionStorage.getItem('cnhs_session') || '{}');
    if (userSession.id) {
        userSession.name = newName;
        sessionStorage.setItem('cnhs_session', JSON.stringify(userSession));
    }
    
    // Update top sidebar display
    const displayNameEl = document.getElementById('user-display-name');
    if (displayNameEl) displayNameEl.innerText = newName;

    // If teacher, attempt to save to backend / system_teachers
    if (currentUser.role === 'teacher' || currentUser.role === 'curriculum_coordinator' || currentUser.id.startsWith('T-') || currentUser.id.startsWith('JHS-')) {
        let storedTeachers = JSON.parse(localStorage.getItem('system_teachers') || 'null');
        if (storedTeachers) {
            const t = storedTeachers.find(x => x.id === currentUser.id);
            if (t) {
                t.name = newName;
                localStorage.setItem('system_teachers', JSON.stringify(storedTeachers));
            }
        }
        
        // Also try backend for real DB teachers
        if (currentUser.db_id) {
            try {
                await fetch(`/api/teachers/${currentUser.db_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName })
                });
            } catch (e) {
                console.warn('Failed to save name to backend DB', e);
            }
        }
    }
    
    triggerMockSuccess('Profile name updated successfully!');
}
