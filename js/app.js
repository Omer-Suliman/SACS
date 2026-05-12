// app.js
// ============================================================
// HELPERS & STATE
// ============================================================

const DEFAULT_PASSWORD_HASH = "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";

async function hashString(str) {
    if (!crypto.subtle) return btoa(str); // Fallback for non-secure contexts
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
    const label = type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info';
    toast.innerHTML = `
        <div class="toast-title"><i data-feather="${icon}" style="width:13px;height:13px;display:inline;vertical-align:middle;margin-right:4px;"></i>${label}</div>
        <div style="font-size:0.82rem;margin-top:0.15rem;color:var(--text-muted);">${message}</div>
        <div class="toast-progress"></div>
    `;
    container.appendChild(toast);
    if (typeof feather !== 'undefined') feather.replace();
    setTimeout(() => {
        toast.classList.add('leaving');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

const fmt = {
    dt: (t) => new Date(t).toLocaleString(),
    days: (n) => n * 24 * 3600 * 1000,
    code: () => "VX-" + Math.random().toString(16).slice(2, 6).toUpperCase(),
};

let editingSlotId = null;
let editingActivityId = null;
let editingClubId = null;
let editingRewardId = null;

let currentClubId = null;
let editingEventId = null;
let editingPostId = null;

async function seedIfEmpty() {
    const hasData = await db.hasData();
    if (hasData) return;

    const now = Date.now(), day = 24 * 3600 * 1000;
    const seed = {
        users: [
            { id: "u1", name: "Student User", email: "student@university.edu", role: "STUDENT", status: "ACTIVE", hashedPassword: DEFAULT_PASSWORD_HASH },
            { id: "u2", name: "Dr. Sara Ali", email: "advisor@university.edu", role: "DOCTOR", status: "ACTIVE", hashedPassword: DEFAULT_PASSWORD_HASH },
            { id: "u3", name: "Registrar Staff", email: "staff@university.edu", role: "STAFF", status: "ACTIVE", hashedPassword: DEFAULT_PASSWORD_HASH },
            { id: "u4", name: "System Admin", email: "admin@university.edu", role: "ADMIN", status: "ACTIVE", hashedPassword: DEFAULT_PASSWORD_HASH },
            { id: "u5", name: "Cafeteria Manager", email: "partner@business.com", role: "PARTNER", status: "ACTIVE", hashedPassword: DEFAULT_PASSWORD_HASH }
        ],
        appointmentSlots: [
            { id: "sl1", createdByUserId: "u2", createdByName: "Dr. Sara Ali", date: new Date(now + day).toISOString().slice(0, 10), startTime: "10:00", endTime: "11:00", capacity: 3, booked: 0, office: "Room 101" },
            { id: "sl2", createdByUserId: "u2", createdByName: "Dr. Sara Ali", date: new Date(now + 2 * day).toISOString().slice(0, 10), startTime: "14:00", endTime: "16:00", capacity: 2, booked: 1, office: "CS-204" },
            { id: "sl3", createdByUserId: "u3", createdByName: "Registrar Staff", date: new Date(now + day).toISOString().slice(0, 10), startTime: "09:00", endTime: "12:00", capacity: 30, booked: 2, office: "Registrar Hall" },
        ],
        appointments: [],
        activities: [
            { id: "act1", title: "Robotics 101", description: "Intro to Robotics", type: "WORKSHOP", createdBy: "u2", startAt: now + day, endAt: now + day + 2 * 3600000, location: "Lab A", capacity: 30, points: 10, status: "PUBLISHED" },
            { id: "act2", title: "Campus Run", description: "Annual run", type: "SPORT", createdBy: "u3", startAt: now + 2 * day, endAt: now + 2 * day + 2 * 3600000, location: "Stadium", capacity: 50, points: 15, status: "PUBLISHED" },
        ],
        registrations: [],
        clubs: [],
        clubMemberships: [],
        clubEvents: [],
        clubPosts: [],
        points: { "student@university.edu": { balance: 40, lifetime: 40 } },
        pointEvents: [],
        rewards: [
            { id: "rw1", name: "5% off Cafeteria", type: "PERCENT", value: 5, costPoints: 100, minSpend: 30, validDays: 7, partnerId: "p1", status: "ACTIVE" },
            { id: "rw2", name: "₺20 off Campus Shop", type: "AMOUNT", value: 20, costPoints: 250, minSpend: 100, validDays: 14, partnerId: "p2", status: "ACTIVE" },
            { id: "rw3", name: "20 Free Print Pages", type: "ITEM", value: 20, costPoints: 120, partnerId: "p3", status: "ACTIVE" },
        ],
        partners: [
            { id: "p1", name: "Cafeteria" },
            { id: "p2", name: "Campus Shop" },
            { id: "p3", name: "Printing Center" },
        ],
        vouchers: [],
        partnerRedemptions: []
    };
    await db.writeSeed(seed);
}

function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function toLocalISO(ts) {
    const d = new Date(ts);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 16);
}

// Helper to show a loading state on buttons
async function withLoading(btn, asyncFn) {
    const originalText = btn.innerHTML;
    let isDone = false;
    const timeout = setTimeout(() => {
        if (isDone) return;
        btn.disabled = true;
        btn.innerHTML = '<i data-feather="loader" class="w-4 h-4 animate-spin inline"></i> Working...';
        feather.replace();
    }, 200);

    try {
        await asyncFn();
    } finally {
        isDone = true;
        clearTimeout(timeout);
        btn.disabled = false;
        btn.innerHTML = originalText;
        feather.replace();
    }
}

// ============================================================
// CORE RENDERERS & NAVIGATION
// ============================================================

async function showApp() {
    const user = await db.getCurrentUser();
    const auth = document.getElementById("auth");
    const app = document.getElementById("app");
    const nav = document.getElementById("nav");

    if (!user) {
        auth?.classList.remove("hidden");
        app?.classList.add("hidden");
        nav?.classList.add("hidden");
        return;
    }
    auth?.classList.add("hidden");
    app?.classList.remove("hidden");
    nav?.classList.remove("hidden");

    // Update navbar user info
    const userNameEl = document.getElementById("userName");
    const roleBadgeEl = document.getElementById("roleBadge");
    if (userNameEl) userNameEl.textContent = user.name;
    if (roleBadgeEl) roleBadgeEl.textContent = user.role;

    await initTabs();
}

async function initTabs() {
    const user = await db.getCurrentUser();
    if (!user) return;
    const ROLE_TABS = {
        STUDENT: ["dashboard", "queue", "activities", "clubs", "rewards"],
        DOCTOR: ["dashboard", "queue", "activities"],
        STAFF: ["dashboard", "queue", "activities"],
        ADMIN: ["dashboard", "queue", "activities", "clubs", "rewards", "admin"],
        PARTNER: ["partner"]
    };
    const TAB_LABELS = {
        dashboard: "Dashboard",
        queue: "Appointments",
        activities: "Activities",
        clubs: "Clubs",
        rewards: "Rewards",
        admin: "Admin",
        partner: "Partner"
    };

    const tabsContainer = document.getElementById("tabs");
    if (!tabsContainer) return;
    tabsContainer.innerHTML = "";
    const role = user.role === 'ADVISOR' ? 'DOCTOR' : user.role;
    const userTabs = ROLE_TABS[role] || [];

    userTabs.forEach(tabKey => {
        const button = document.createElement("button");
        button.className = "nav-btn";
        button.textContent = TAB_LABELS[tabKey];
        button.dataset.key = tabKey;
        button.addEventListener("click", () => goToPage(tabKey));
        tabsContainer.appendChild(button);
    });

    const lastPage = localStorage.getItem(`sacs_lastpage_${user.role}`);
    if (userTabs.includes(lastPage)) {
        await goToPage(lastPage);
    } else if (userTabs.length > 0) {
        await goToPage(userTabs[0]);
    }
}

async function goToPage(page) {
    const user = await db.getCurrentUser();
    if (user) localStorage.setItem(`sacs_lastpage_${user.role}`, page);

    document.querySelectorAll("#tabs .nav-btn").forEach(tab => {
        if (tab.dataset.key === page) tab.classList.add('active');
        else tab.classList.remove('active');
    });

    document.querySelectorAll("main [data-page]").forEach(section => {
        section.classList.toggle("hidden", section.dataset.page !== page);
    });

    document.getElementById("queueManageWrap")?.classList.toggle("hidden", !["DOCTOR", "STAFF"].includes(user?.role));
    document.getElementById("createSlotForm")?.classList.add("hidden");

    const renderFn = `render${page.charAt(0).toUpperCase() + page.slice(1)}`;
    if (window[renderFn]) await window[renderFn]();
    feather.replace();
}

// ============================================================
// DASHBOARD
// ============================================================

function createEmptyState(icon, title, text) {
    return `
    <div class="empty-state">
      <i data-feather="${icon}" class="empty-icon"></i>
      <div class="empty-title">${title}</div>
      <div class="empty-text">${text}</div>
    </div>`;
}

async function renderDashboard() {
    const user = await db.getCurrentUser();
    const cards = document.getElementById('dashCards');
    if (!cards) return;
    cards.innerHTML = '';

    if (user.role === 'STUDENT') {
        const studentId = user.id || user._id;

        // Fetch all three in parallel for speed
        const [wallet, mySlots, myClubs, myActivities] = await Promise.all([
            db.getWallet(user.email),
            db.getAppointmentsByStudent(studentId),
            db.getMembershipsByStudent(studentId),
            db.getMyActivities(studentId)
        ]);

        // Wallet card — guard against null if wallet endpoint fails
        const balance = wallet ? wallet.balance : 0;
        const lifetime = wallet ? wallet.lifetime : 0;
        cards.innerHTML += `
            <div class="stat-card stat-success">
                <div class="stat-icon"><i data-feather="zap" class="w-4 h-4"></i></div>
                <div class="stat-label">Points Balance</div>
                <div class="stat-value">${balance}</div>
                <div class="stat-hint">Lifetime earned: ${lifetime} pts</div>
            </div>`;

        cards.innerHTML += `
            <div class="stat-card stat-info">
                <div class="stat-icon"><i data-feather="calendar" class="w-4 h-4"></i></div>
                <div class="stat-label">Booked Slots</div>
                <div class="stat-value">${mySlots.length}</div>
                <div class="stat-hint">${mySlots.length ? 'Upcoming appointments' : 'No slots booked yet'}</div>
            </div>`;

        cards.innerHTML += `
            <div class="stat-card stat-accent">
                <div class="stat-icon"><i data-feather="users" class="w-4 h-4"></i></div>
                <div class="stat-label">My Clubs</div>
                <div class="stat-value">${myClubs.length}</div>
                <div class="stat-hint">Active memberships</div>
            </div>`;

        cards.innerHTML += `
            <div class="stat-card stat-warn">
                <div class="stat-icon"><i data-feather="activity" class="w-4 h-4"></i></div>
                <div class="stat-label">Registered Activities</div>
                <div class="stat-value">${myActivities.length}</div>
                <div class="stat-hint">Events you've signed up for</div>
            </div>`;

        // Recent points feed
        const pointsEvents = await db.getPointEvents(user.email, 5);
        if (pointsEvents.length > 0) {
            const listHtml = pointsEvents.map(e => `
                <li>
                    <span>${e.reason || 'Activity points'}</span>
                    <span class="${e.amount > 0 ? 'pos' : 'neg'}">${e.amount > 0 ? '+' : ''}${e.amount} <span class="date ml-2">${fmt.dt(e.at)}</span></span>
                </li>
            `).join('');

            cards.insertAdjacentHTML('afterend', `
                <div class="activity-feed mt-6">
                    <h4>Recent Activity</h4>
                    <ul>${listHtml}</ul>
                </div>
            `);
        }
    } else if (user.role === 'ADMIN') {
        const users = await db.getUsers();
        const acts = await db.getActivities();
        const pendingClubs = await db.getClubsByStatus('PENDING');

        cards.innerHTML += `
            <div class="stat-card stat-info">
                <div class="stat-icon"><i data-feather="users" class="w-4 h-4"></i></div>
                <div class="stat-label">Total Users</div>
                <div class="stat-value">${users.length}</div>
                <div class="stat-hint">Across all roles</div>
            </div>`;
        cards.innerHTML += `
            <div class="stat-card stat-success">
                <div class="stat-icon"><i data-feather="activity" class="w-4 h-4"></i></div>
                <div class="stat-label">Activities</div>
                <div class="stat-value">${acts.length}</div>
                <div class="stat-hint">Created globally</div>
            </div>`;
        cards.innerHTML += `
            <div class="stat-card stat-warn clickable" onclick="goToPage('admin')">
                <div class="stat-icon"><i data-feather="clock" class="w-4 h-4"></i></div>
                <div class="stat-label">Pending Clubs</div>
                <div class="stat-value">${pendingClubs.length}</div>
                <div class="stat-hint">Awaiting approval — click to review</div>
            </div>`;
    } else {
        cards.innerHTML += `
            <div class="stat-card">
                <div class="stat-label">Welcome</div>
                <div class="stat-value">Hello,</div>
                <div class="stat-hint">${user.name}</div>
            </div>`;
    }

    if (typeof feather !== 'undefined') feather.replace();
}

// ============================================================
// MODALS
// ============================================================

async function openEventForm(evId) {
    editingEventId = evId || null;
    let title = '', desc = '', dt = '', loc = '';

    if (evId) {
        const e = await db.getClubEventById(evId);
        title = e.title; desc = e.description; dt = toLocalISO(e.startAt); loc = e.location;
    }

    const body = document.getElementById('modalBody');
    body.innerHTML = `
        <h3 style="font-family:'Fraunces',serif;font-size:1.25rem;font-weight:500;color:var(--navy);margin-bottom:1.25rem;">${evId ? 'Edit' : 'Create'} Event</h3>
        <form id="modalForm" class="space-y-3">
            <div><label>Title</label><input id="evTitle" placeholder="Event title" value="${title}" required></div>
            <div><label>Description</label><textarea id="evDesc" placeholder="What's this event about?" rows="3">${desc}</textarea></div>
            <div><label>Date & Time</label><input type="datetime-local" id="evDate" value="${dt}" required></div>
            <div><label>Location</label><input id="evLoc" placeholder="e.g. Room 302 or Online" value="${loc}" required></div>
            <button type="submit" class="btn primary w-full" style="margin-top:0.5rem;">
                <i data-feather="check" style="width:16px;height:16px;"></i> Save Event
            </button>
        </form>`;

    document.getElementById('modalOverlay').classList.remove('hidden');
    // Using setTimeout to allow display:block to apply before adding opacity class
    setTimeout(() => document.getElementById('modalOverlay').classList.add('show'), 10);

    document.getElementById('modalCloseBtn').onclick = closeModal;
    document.getElementById('modalForm').onsubmit = async (e) => {
        e.preventDefault();
        const evData = {
            title: document.getElementById('evTitle').value,
            description: document.getElementById('evDesc').value,
            startAt: new Date(document.getElementById('evDate').value).getTime(),
            location: document.getElementById('evLoc').value,
            clubId: currentClubId
        };
        if (editingEventId) { await db.updateClubEvent(editingEventId, evData); }
        else { await db.addClubEvent(evData); }
        closeModal(); await renderClubEvents();
    };
}

async function openPostForm(pid) {
    editingPostId = pid || null;
    let title = '', content = '';

    if (pid) {
        const p = await db.getClubPostById(pid);
        title = p.title; content = p.content;
    }

    const body = document.getElementById('modalBody');
    body.innerHTML = `
        <h3 style="font-family:'Fraunces',serif;font-size:1.25rem;font-weight:500;color:var(--navy);margin-bottom:1.25rem;">${pid ? 'Edit' : 'Create'} Post</h3>
        <form id="modalForm" class="space-y-3">
            <div><label>Title</label><input id="postTitle" placeholder="Post title" value="${title}" required></div>
            <div><label>Content</label><textarea id="postContent" placeholder="Write your update here…" rows="5" required>${content}</textarea></div>
            <button type="submit" class="btn primary w-full" style="margin-top:0.5rem;">
                <i data-feather="check" style="width:16px;height:16px;"></i> Save Post
            </button>
        </form>`;

    document.getElementById('modalOverlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('modalOverlay').classList.add('show'), 10);

    document.getElementById('modalCloseBtn').onclick = closeModal;
    document.getElementById('modalForm').onsubmit = async (e) => {
        e.preventDefault();
        const user = await db.getCurrentUser();
        const pData = {
            title: document.getElementById('postTitle').value,
            content: document.getElementById('postContent').value,
            clubId: currentClubId,
            author: user.name,
            createdAt: Date.now()
        };
        if (editingPostId) { await db.updateClubPost(editingPostId, pData); }
        else { await db.addClubPost(pData); }
        closeModal(); await renderClubPosts();
    };
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('show');
    // Wait for transition to finish before hiding completely
    setTimeout(() => overlay.classList.add('hidden'), 200);
}

// Close modal on backdrop click or ESC
document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('modalOverlay')?.classList.contains('show')) closeModal();
});

// ============================================================
// APP INITIALIZATION & EVENT LISTENERS
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    await seedIfEmpty();
    await showApp();
    setupEventListeners();

    document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const errorEl = document.getElementById('loginError');
        errorEl.classList.add('hidden');

        await withLoading(btn, async () => {
            try {
                const user = await login(username, password);
                if (!user) throw new Error("Invalid credentials");
                await showApp();
                showToast('Logged in!', 'success');
            } catch (err) {
                errorEl.innerHTML = `<i data-feather="alert-circle" class="inline w-4 h-4 mr-1"></i> ${err.message}`;
                errorEl.classList.remove('hidden');
                feather.replace();
            }
        });
    });

    const loginContainer = document.getElementById("loginContainer");
    const signupContainer = document.getElementById("signupContainer");
    const forgotContainer = document.getElementById("forgotContainer");

    document.getElementById("showSignup")?.addEventListener("click", (e) => {
        e.preventDefault();
        loginContainer?.classList.add("hidden");
        forgotContainer?.classList.add("hidden");
        signupContainer?.classList.remove("hidden");
    });
    document.getElementById("showForgot")?.addEventListener("click", (e) => {
        e.preventDefault();
        loginContainer?.classList.add("hidden");
        signupContainer?.classList.add("hidden");
        forgotContainer?.classList.remove("hidden");
    });
    document.getElementById("backToLogin")?.addEventListener("click", (e) => {
        e.preventDefault();
        signupContainer?.classList.add("hidden");
        loginContainer?.classList.remove("hidden");
    });
    document.getElementById("backToLogin2")?.addEventListener("click", (e) => {
        e.preventDefault();
        forgotContainer?.classList.add("hidden");
        loginContainer?.classList.remove("hidden");
    });

    document.getElementById("signupForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const name = document.getElementById("signupName").value;
        const email = document.getElementById("signupEmail").value;
        const pass = document.getElementById("signupPassword").value;
        const confirm = document.getElementById("signupConfirm").value;
        if (pass !== confirm) { showToast("Passwords do not match", 'error'); return; }

        await withLoading(btn, async () => {
            try {
                await signup(name, email, pass);
                await showApp();
                showToast('Account created!', 'success');
            } catch (err) { showToast(err.message, 'error'); }
        });
    });

    document.getElementById("forgotForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        await withLoading(btn, async () => {
            try {
                const msg = await resetPassword(document.getElementById("forgotEmail").value);
                showToast(msg, 'success');
                forgotContainer?.classList.add("hidden");
                loginContainer?.classList.remove("hidden");
            } catch (err) { showToast(err.message, 'error'); }
        });
    });
});

function setupEventListeners() {
    // We use event delegation for most interactions
    document.addEventListener('click', async (e) => {
        const user = await db.getCurrentUser();
        if (!user) return;

        // Appointments
        const slotBookBtn = e.target.closest('.slot-book-btn');
        if (slotBookBtn) {
            const slotId = slotBookBtn.dataset.id;
            // Prefer .id (normalized on login/signup) — fall back to ._id only if missing
            const studentId = user.id || user._id;

            if (!slotId || slotId === 'undefined') { showToast('Invalid slot. Try refreshing.', 'error'); return; }
            if (!studentId) { showToast('Not logged in properly. Please re-login.', 'error'); return; }

            const slot = await db.getAppointmentSlotById(slotId);
            if (!slot) { showToast('Slot not found.', 'error'); return; }
            if (slot.booked >= slot.capacity) { showToast("Fully booked.", 'error'); return; }

            // Duplicate-booking check: the slot's bookedBy[] array is the source of truth
            const alreadyBooked = Array.isArray(slot.bookedBy) &&
                slot.bookedBy.map(id => id.toString()).includes(studentId.toString());
            if (alreadyBooked) { showToast("You have already booked this slot.", 'error'); return; }

            // Single API call — PUT /slots/book/:id handles both booked++ and bookedBy.push()
            const result = await db.bookSlot(slotId, studentId);
            if (result) {
                await renderQueue(); showToast('Booked successfully!', 'success');
            } else {
                showToast('Booking failed. Please try again.', 'error');
            }
        }
        const slotCancelBtn = e.target.closest('.slot-cancel-btn');
        if (slotCancelBtn) {
            const studentId = user.id || user._id;
            const canceled = await db.cancelAppointment(slotCancelBtn.dataset.id, studentId);
            if (canceled) {
                await renderQueue(); showToast('Cancelled.', 'success');
            }
        }
        const slotDeleteBtn = e.target.closest('.slot-delete-btn');
        if (slotDeleteBtn) {
            window.customConfirmDelete("Delete Slot", "Are you sure you want to delete this slot?", async () => {
                await db.deleteAppointmentSlot(slotDeleteBtn.dataset.id);
                await renderQueue();
            });
        }
        const slotEditBtn = e.target.closest('.slot-edit-btn');
        if (slotEditBtn) {
            const slot = await db.getAppointmentSlotById(slotEditBtn.dataset.id);
            editingSlotId = slot.id;
            const form = document.getElementById('createSlotForm');
            document.getElementById('slotDate').value = slot.date;
            document.getElementById('slotOffice').value = slot.office;
            document.getElementById('slotStartTime').value = slot.startTime;
            document.getElementById('slotEndTime').value = slot.endTime;
            document.getElementById('slotCapacity').value = slot.capacity;
            form.querySelector('button[type="submit"]').textContent = 'Update Slot';
            form.classList.remove('hidden');
        }

        // Activities
        const actRegBtn = e.target.closest('.act-reg-btn');
        if (actRegBtn) {
            const activityId = actRegBtn.dataset.id;
             // verify this is a real ObjectId string, not 'undefined'
            if (!activityId || activityId === 'undefined') { showToast('Invalid activity. Try refreshing.', 'error'); return; }
            const result = await db.addRegistration({ activityId, user: user.email, attended: false });
            if (result) { await renderActivities(); showToast('Registered!', 'success'); }
            else { showToast('Could not register. Try again.', 'error'); }
        }
        const actUnregBtn = e.target.closest('.act-unreg-btn');
        if (actUnregBtn) {
            await db.deleteRegistration(actUnregBtn.dataset.id, user.email);
            await renderActivities(); showToast('Unregistered.', 'success');
        }
        const actDelBtn = e.target.closest('.act-delete-btn');
        if (actDelBtn) {
            window.customConfirmDelete("Delete Activity", "Are you sure you want to delete this activity?", async () => {
                await db.deleteActivity(actDelBtn.dataset.id);
                await renderActivities();
            });
        }
        const actEditBtn = e.target.closest('.act-edit-btn');
        if (actEditBtn) {
            const act = await db.getActivityById(actEditBtn.dataset.id);
            editingActivityId = act.id;
            document.getElementById('newActTitle').value = act.title;
            document.getElementById('newActType').value = act.type;
            document.getElementById('newActStart').value = new Date(act.startAt).toISOString().slice(0, 16);
            document.getElementById('newActEnd').value = new Date(act.endAt).toISOString().slice(0, 16);
            document.getElementById('newActLoc').value = act.location;
            document.getElementById('newActDesc').value = act.description;
            document.getElementById('newActCap').value = act.capacity;
            document.getElementById('newActPoints').value = act.points;
            document.getElementById('createActForm').querySelector('button[type="submit"]').textContent = 'Update Activity';
            document.getElementById('createActForm').scrollIntoView();
        }

        // Rewards
        const redeemBtn = e.target.closest('.redeem-btn');
        if (redeemBtn) {
            if (redeemBtn.classList.contains('disabled') || redeemBtn.disabled) return;
            const rewardId = redeemBtn.dataset.id;
            const studentId = user._id || user.id;

            // Confirm intent before hitting the server
            const r = await db.getRewardById(rewardId);
            if (!r) { showToast('Reward not found.', 'error'); return; }
            
            window.customConfirmRedeem("Redeem Reward", `Redeem "${r.name}" for ${r.costPoints} pts?`, async () => {
                const result = await db.claimReward(rewardId, studentId);

                if (result && result.voucher) {
                    showToast(`Voucher ${result.voucher.code} issued! Balance: ${result.newPointsBalance} pts`, 'success');
                    await renderRewards();
                    await renderDashboard();
                } else {
                    // result is null when apiCall gets a non-2xx status
                    showToast('Could not claim reward. Check your points or stock.', 'error');
                }
            });
        }

        // Clubs
        const joinClubBtn = e.target.closest('.join-club-btn');
        if (joinClubBtn) {
            if (user.role !== 'STUDENT') { showToast('Students only.', 'error'); return; }
            const clubId = joinClubBtn.dataset.id;
            // Prefer .id (normalized on login/signup) — fall back to ._id only if missing
            const studentId = user.id || user._id;

            if (!clubId || clubId === 'undefined') { showToast('Invalid club. Try refreshing.', 'error'); return; }

            // Only allow joining APPROVED clubs
            const club = await db.getClubById(clubId);
            if (!club || club.status !== 'APPROVED') { showToast('This club is not open for membership.', 'error'); return; }

            const result = await db.joinClub(clubId, studentId);
            if (result) {
                // Also record in the memberships collection for backwards compatibility
                await db.addMembership({ clubId, studentId, role: 'MEMBER' });
                await renderClubs();
                showToast('Joined!', 'success');
            } else {
                showToast('Could not join club. Try again.', 'error');
            }
        }
        const leaveClubBtn = e.target.closest('.leave-club-btn');
        if (leaveClubBtn) {
            const mem = await db.getMembership(leaveClubBtn.dataset.id, user.id);
            if (mem && mem.role === 'PRESIDENT') { showToast('Leader cannot leave.', 'error'); return; }
            await db.deleteMembership(leaveClubBtn.dataset.id, user.id);
            await renderClubs(); showToast('Left club.', 'success');
        }
        // club-delete-btn delegation removed in favor of inline bindings
        const editTrigger = e.target.closest('.edit-club-trigger-btn');
        if (editTrigger) {
            e.preventDefault();
            const targetClubId = editTrigger.dataset.id;
            
            const formWrap = document.getElementById('clubCreateWrap'); 
            if (formWrap) {
                formWrap.classList.remove('hidden');
                
                // Populate the form with existing club data
                const club = await db.getClubById(targetClubId);
                if (club) {
                    editingClubId = club.id;
                    document.getElementById('clubName').value = club.name;
                    document.getElementById('clubLoc').value = club.location;
                    document.getElementById('clubDays').value = club.meetingDays;
                    document.getElementById('clubTime').value = club.meetingTime;
                    document.getElementById('clubDesc').value = club.description;
                }
            } else {
                console.error("CRITICAL: The modal wrapper 'clubCreateWrap' was not found in the DOM.");
            }
        }

        // Club Detail Navigation
        const cardEl = e.target.closest('.club-card');
        if (cardEl && !e.target.closest('button')) {
            await openClubDetail(cardEl.dataset.id);
        }
        if (e.target.closest('#clubTabNav')) {
            const btn = e.target.closest('.tab-btn');
            if (btn) await switchClubTab(btn.dataset.tab);
        }
        if (e.target.closest('.create-event-btn')) await openEventForm();
        if (e.target.closest('.event-edit-btn')) await openEventForm(e.target.closest('.event-edit-btn').dataset.id);
        if (e.target.closest('.create-post-btn')) await openPostForm();
        if (e.target.closest('.post-edit-btn')) await openPostForm(e.target.closest('.post-edit-btn').dataset.id);

        // Admin
        const adminDelUser = e.target.closest('.admin-del-user');
        if (adminDelUser) {
            window.customConfirmDelete("Delete User", "Are you sure you want to delete this user?", async () => {
                await db.deleteUser(adminDelUser.dataset.id);
                await renderAdmin();
            });
        }
        const adminClubAction = e.target.closest('.admin-club-action');
        if (adminClubAction) {
            const clubId = adminClubAction.dataset.id;
            const newStatus = adminClubAction.dataset.action;  // 'APPROVED' or 'REJECTED'
            const result = await db.updateClubStatus(clubId, newStatus);
            if (result) {
                showToast(`Club ${newStatus.toLowerCase()}.`, newStatus === 'APPROVED' ? 'success' : 'error');
                await renderAdmin();   // removes club from the Pending section
                await renderClubs();   // reflects new status in the Clubs tab
            } else {
                showToast('Action failed. Check the console.', 'error');
            }
        }
    });

    // Handle change events for admin role dropdown
    document.addEventListener('change', async (e) => {
        if (e.target.classList.contains('admin-role-select')) {
            const userId = e.target.dataset.id;
            const newRole = e.target.value;
            await db.updateUser(userId, { role: newRole });
            showToast('Role updated successfully.', 'success');
        }
    });

    document.getElementById('btnCreateSlot')?.addEventListener('click', () => {
        document.getElementById('createSlotForm').classList.toggle('hidden');
        editingSlotId = null;
    });

    document.getElementById('createSlotForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = await db.getCurrentUser();
        const office = document.getElementById('slotOffice').value;
        const date = document.getElementById('slotDate').value;
        const start = document.getElementById('slotStartTime').value;
        const end = document.getElementById('slotEndTime').value;
        const cap = parseInt(document.getElementById('slotCapacity').value);

        if (editingSlotId) {
            await db.updateAppointmentSlot(editingSlotId, { office, date, startTime: start, endTime: end, capacity: cap });
            editingSlotId = null;
        } else {
            const userId = user._id || user.id;
            await db.addAppointmentSlot({
                createdByUserId: userId,
                createdByName: user.name,
                role: user.role,   // sent to backend for server-side role guard
                office, date, startTime: start, endTime: end, capacity: cap, booked: 0
            });
        }
        await db.getSlots();
        await renderQueue(); e.target.reset(); document.getElementById('createSlotForm').classList.add('hidden');
    });

    document.getElementById('createActForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = await db.getCurrentUser();
        const act = {
            title: document.getElementById('newActTitle').value,
            type: document.getElementById('newActType').value,
            startAt: new Date(document.getElementById('newActStart').value).getTime(),
            endAt: new Date(document.getElementById('newActEnd').value).getTime(),
            location: document.getElementById('newActLoc').value,
            description: document.getElementById('newActDesc').value,
            capacity: parseInt(document.getElementById('newActCap').value),
            points: parseInt(document.getElementById('newActPoints').value)
        };

        if (editingActivityId) {
            await db.updateActivity(editingActivityId, act);
            editingActivityId = null;
        } else {
            // Use .id (normalized on login/signup) — fall back to ._id only if missing
            const userId = user.id || user._id;
            act.createdBy = userId;
            act.status = 'PUBLISHED';
            await db.addActivity(act);
        }
        await renderActivities(); e.target.reset();
    });

    document.getElementById('btnMarkAttend')?.addEventListener('click', async () => {
        const activityId = document.getElementById('attendActSelect').value;
        const studentEmail = document.getElementById('attendStudentEmail').value.trim();
        
        if (!activityId) { showToast('Please select an activity first.', 'error'); return; }
        if (!studentEmail) { showToast('Please enter a student email.', 'error'); return; }
        
        const btn = document.getElementById('btnMarkAttend');
        await withLoading(btn, async () => {
            try {
                const result = await db.markAttendance(activityId, studentEmail);
                showToast(result.message || 'Attendance marked successfully!', 'success');
                document.getElementById('attendStudentEmail').value = '';
                
                // Add to recent attendance list
                const attendanceList = document.getElementById('attendanceList');
                if (attendanceList) {
                    const selectEl = document.getElementById('attendActSelect');
                    const actTitle = selectEl.options[selectEl.selectedIndex].text;
                    attendanceList.insertAdjacentHTML('afterbegin', `<div class="flex items-center gap-2 text-sm"><i data-feather="check" class="text-success" style="width:14px;height:14px;"></i> <span class="font-medium" style="color:var(--navy)">${studentEmail}</span> marked present for <span style="color:var(--text-muted)">${actTitle}</span></div>`);
                    if (window.feather) window.feather.replace();
                }
                
                await renderActivities();
            } catch (err) {
                showToast(err.message || 'Failed to mark attendance.', 'error');
            }
        });
    });

    document.getElementById('btnShowCreateClub')?.addEventListener('click', () => {
        editingClubId = null;
        document.getElementById('createClubForm').reset();
        document.getElementById('clubCreateWrap').classList.toggle('hidden');
    });

    document.getElementById('createClubForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = await db.getCurrentUser();
        const userId = user._id || user.id;
        const clubDef = {
            name: document.getElementById('clubName').value,
            location: document.getElementById('clubLoc').value,
            meetingDays: document.getElementById('clubDays').value,
            meetingTime: document.getElementById('clubTime').value,
            description: document.getElementById('clubDesc').value
        };

        if (editingClubId) {
            await db.updateClub(editingClubId, clubDef);
            editingClubId = null;
        } else {
            // Include role (for backend guard) and lead (founding user)
            const added = await db.addClub({
                ...clubDef,
                role: user.role,
                createdBy: userId,
                lead: userId,
                status: 'PENDING',
                createdAt: Date.now()
            });
            // Register the creator as PRESIDENT in memberships for detail view
            if (added) {
                const newClubId = added._id || added.id;
                await db.addMembership({ clubId: newClubId, studentId: userId, role: 'PRESIDENT' });
            }
        }
        await renderClubs(); e.target.reset();
    });
}

// ============================================================
// GLOBAL INLINE BINDINGS FOR CLUB MODALS
// ============================================================

window.openClubEditModal = async function(clubId) {
    const formWrap = document.getElementById('clubCreateWrap'); // The exact real ID
    
    if (!formWrap) {
        console.error("CRITICAL: Modal element not found in the DOM. Check the ID.");
        return;
    }
    
    // CRITICAL: The wrap is inside 'clubsListView', which has display:none when looking at club details!
    // We MUST append it to the body to escape the hidden parent constraint.
    if (formWrap.parentNode.id === 'clubsListView') {
        document.body.appendChild(formWrap);
    }
    
    // Force visibility and styling to make it a centered overlay
    formWrap.classList.remove('hidden');
    formWrap.style.display = 'block'; 
    formWrap.style.position = 'fixed';
    formWrap.style.top = '50%';
    formWrap.style.left = '50%';
    formWrap.style.transform = 'translate(-50%, -50%)';
    formWrap.style.zIndex = '9999'; 
    formWrap.style.width = '90%';
    formWrap.style.maxWidth = '600px';
    formWrap.style.boxShadow = '0 0 0 9999px rgba(0,0,0,0.5)'; // Instant dark backdrop
    
    // Add a simple close button dynamically if it doesn't exist
    if (!document.getElementById('editClubCloseBtn')) {
        const closeBtn = document.createElement('button');
        closeBtn.id = 'editClubCloseBtn';
        closeBtn.type = 'button';
        closeBtn.innerHTML = '<i data-feather="x"></i>';
        closeBtn.className = 'absolute top-4 right-4 text-gray-500 hover:text-gray-800';
        closeBtn.onclick = function() {
            formWrap.classList.add('hidden');
            formWrap.style.display = 'none';
        };
        formWrap.appendChild(closeBtn);
        feather.replace(); // render the X icon
    }
    
    const club = await db.getClubById(clubId);
    if (club) {
        editingClubId = club.id;
        document.getElementById('clubName').value = club.name;
        document.getElementById('clubLoc').value = club.location;
        document.getElementById('clubDays').value = club.meetingDays;
        document.getElementById('clubTime').value = club.meetingTime;
        document.getElementById('clubDesc').value = club.description;
        document.querySelector('#clubCreateWrap h3').textContent = "Edit Club";
    }
};

window.openClubEventModal = async function(clubId) {
    // There is an existing openEventForm function that does this logic, 
    // it defaults to creating an event for currentClubId when called without args
    if (typeof openEventForm === 'function') {
        await openEventForm();
    } else {
        const eventWrap = document.getElementById('eventCreateWrap'); 
        if(eventWrap) eventWrap.classList.remove('hidden');
    }
};

window.openClubPostModal = async function(clubId) {
    // There is an existing openPostForm function
    if (typeof openPostForm === 'function') {
        await openPostForm();
    } else {
        const postWrap = document.getElementById('postCreateWrap'); 
        if(postWrap) postWrap.classList.remove('hidden');
    }
};

window.customConfirmDelete = function(title, text, onConfirm) {
    const modalId = 'customDeleteConfirmModal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const htmlString = `
        <div id="${modalId}" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 opacity-0 transition-opacity duration-200" style="position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background-color: rgba(0,0,0,0.5); backdrop-filter: blur(4px);">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden transform scale-95 transition-transform duration-200" style="background: white; border-radius: 0.75rem; width: 100%; max-width: 24rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                <div class="p-6 text-center" style="padding: 1.5rem; text-align: center;">
                    <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600" style="width: 4rem; height: 4rem; border-radius: 9999px; background-color: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                        <i data-feather="trash-2" style="width: 2rem; height: 2rem;"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-2" style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; color: #111827;">${title}</h3>
                    <p class="text-gray-500 text-sm mb-6" style="color: #6b7280; margin-bottom: 1.5rem; font-size: 0.875rem;">${text}</p>
                    <div class="flex gap-3" style="display: flex; gap: 0.75rem;">
                        <button id="${modalId}-cancel" type="button" class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors" style="flex: 1; padding: 0.5rem 1rem; background-color: #f3f4f6; color: #1f2937; font-weight: 500; border-radius: 0.5rem; cursor: pointer; border: none;">Cancel</button>
                        <button id="${modalId}-confirm" type="button" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex justify-center items-center" style="flex: 1; padding: 0.5rem 1rem; background-color: #dc2626; color: white; font-weight: 500; border-radius: 0.5rem; cursor: pointer; border: none; display: flex; justify-content: center; align-items: center;">Yes, Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', htmlString);
    const overlay = document.getElementById(modalId);
    
    if (typeof feather !== 'undefined') feather.replace();

    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        overlay.style.opacity = '1';
        const inner = overlay.querySelector('div');
        if (inner) {
            inner.classList.remove('scale-95');
            inner.style.transform = 'scale(1)';
        }
    }, 10);

    const close = () => {
        overlay.classList.add('opacity-0');
        overlay.style.opacity = '0';
        const inner = overlay.querySelector('div');
        if (inner) {
            inner.classList.add('scale-95');
            inner.style.transform = 'scale(0.95)';
        }
        setTimeout(() => overlay.remove(), 200);
    };

    document.getElementById(`${modalId}-cancel`).onclick = close;
    document.getElementById(`${modalId}-confirm`).onclick = async (e) => {
        const btn = e.currentTarget;
        btn.innerHTML = '<i data-feather="loader" style="width: 1.25rem; height: 1.25rem;" class="animate-spin"></i>';
        if (typeof feather !== 'undefined') feather.replace();
        btn.disabled = true;
        btn.style.opacity = '0.7';
        await onConfirm();
        close();
    };
};

window.customConfirmRedeem = function(title, text, onConfirm) {
    const modalId = 'customRedeemConfirmModal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const htmlString = `
        <div id="${modalId}" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 opacity-0 transition-opacity duration-200" style="position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background-color: rgba(0,0,0,0.5); backdrop-filter: blur(4px);">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden transform scale-95 transition-transform duration-200" style="background: white; border-radius: 0.75rem; width: 100%; max-width: 24rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                <div class="p-6 text-center" style="padding: 1.5rem; text-align: center;">
                    <div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 text-blue-600" style="width: 4rem; height: 4rem; border-radius: 9999px; background-color: #dbeafe; color: #2563eb; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                        <i data-feather="gift" style="width: 2rem; height: 2rem;"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-2" style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; color: #111827;">${title}</h3>
                    <p class="text-gray-500 text-sm mb-6" style="color: #6b7280; margin-bottom: 1.5rem; font-size: 0.875rem;">${text}</p>
                    <div class="flex gap-3" style="display: flex; gap: 0.75rem;">
                        <button id="${modalId}-cancel" type="button" class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors" style="flex: 1; padding: 0.5rem 1rem; background-color: #f3f4f6; color: #1f2937; font-weight: 500; border-radius: 0.5rem; cursor: pointer; border: none;">Cancel</button>
                        <button id="${modalId}-confirm" type="button" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex justify-center items-center" style="flex: 1; padding: 0.5rem 1rem; background-color: #2563eb; color: white; font-weight: 500; border-radius: 0.5rem; cursor: pointer; border: none; display: flex; justify-content: center; align-items: center;">Yes, Redeem</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', htmlString);
    const overlay = document.getElementById(modalId);
    
    if (typeof feather !== 'undefined') feather.replace();

    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        overlay.style.opacity = '1';
        const inner = overlay.querySelector('div');
        if (inner) {
            inner.classList.remove('scale-95');
            inner.style.transform = 'scale(1)';
        }
    }, 10);

    const close = () => {
        overlay.classList.add('opacity-0');
        overlay.style.opacity = '0';
        const inner = overlay.querySelector('div');
        if (inner) {
            inner.classList.add('scale-95');
            inner.style.transform = 'scale(0.95)';
        }
        setTimeout(() => overlay.remove(), 200);
    };

    document.getElementById(`${modalId}-cancel`).onclick = close;
    document.getElementById(`${modalId}-confirm`).onclick = async (e) => {
        const btn = e.currentTarget;
        btn.innerHTML = '<i data-feather="loader" style="width: 1.25rem; height: 1.25rem;" class="animate-spin"></i>';
        if (typeof feather !== 'undefined') feather.replace();
        btn.disabled = true;
        btn.style.opacity = '0.7';
        await onConfirm();
        close();
    };
};


window.deleteClubEvent = function(eventId) {
    window.customConfirmDelete("Delete Event", "Are you sure you want to delete this event? This action cannot be undone.", async () => {
        await db.deleteClubEvent(eventId);
        if (typeof renderClubEvents === 'function') await renderClubEvents();
        if (typeof renderClubOverview === 'function') await renderClubOverview();
    });
};

window.deleteClubPost = function(postId) {
    window.customConfirmDelete("Delete Post", "Are you sure you want to delete this post? This action cannot be undone.", async () => {
        await db.deleteClubPost(postId);
        if (typeof renderClubPosts === 'function') await renderClubPosts();
        if (typeof renderClubOverview === 'function') await renderClubOverview();
    });
};

window.deleteClub = function(clubId) {
    window.customConfirmDelete("Delete Club", "Are you sure you want to delete this club? This action cannot be undone.", async () => {
        await db.deleteClub(clubId);
        if (typeof renderClubs === 'function') await renderClubs();
        if (typeof renderAdmin === 'function') await renderAdmin();
    });
};

window.joinClub = async function(clubId) {
    try {
        const user = await db.getCurrentUser();
        if (!user) {
            console.error("[joinClub] No current user found!");
            showToast('You must be logged in to join.', 'error');
            return;
        }
        if (user.role !== 'STUDENT') { 
            console.error("[joinClub] User is not a student:", user.role);
            showToast('Students only.', 'error'); 
            return; 
        }
        
        const studentId = user.id || user._id;

        if (!clubId || clubId === 'undefined') { 
            console.error("[joinClub] Invalid clubId passed to inline function.");
            showToast('Invalid club. Try refreshing.', 'error'); 
            return; 
        }

        const club = await db.getClubById(clubId);
        if (!club || club.status !== 'APPROVED') { 
            console.error("[joinClub] Club is missing or not APPROVED:", club);
            showToast('This club is not open for membership.', 'error'); 
            return; 
        }

        const result = await db.joinClub(clubId, studentId);
        if (result) {
            await db.addMembership({ clubId, studentId, role: 'MEMBER' });
            if (typeof renderClubs === 'function') await renderClubs();
            showToast('Joined!', 'success');
        } else {
            console.error("[joinClub] db.joinClub returned null/false. Check network tab.");
            showToast('Could not join club. Try again.', 'error');
        }
    } catch (err) {
        console.error("[joinClub] Critical Exception:", err);
        showToast('Error joining club. See console.', 'error');
    }
};

window.leaveClub = async function(clubId) {
    try {
        const user = await db.getCurrentUser();
        if (!user) {
            console.error("[leaveClub] No current user found!");
            showToast('You must be logged in to leave.', 'error');
            return;
        }
        
        const studentId = user.id || user._id;

        if (!clubId || clubId === 'undefined') { 
            console.error("[leaveClub] Invalid clubId passed to inline function.");
            showToast('Invalid club. Try refreshing.', 'error'); 
            return; 
        }

        const mem = await db.getMembership(clubId, studentId);
        if (mem && mem.role === 'PRESIDENT') { 
            console.error("[leaveClub] Cannot leave: User is the PRESIDENT.");
            showToast('Leader cannot leave the club.', 'error'); 
            return; 
        }

        const result = await db.deleteMembership(clubId, studentId);
        if (result) {
            if (typeof renderClubs === 'function') await renderClubs();
            
            const detailView = document.getElementById('clubDetailView');
            if (detailView && !detailView.classList.contains('hidden')) {
                document.getElementById('clubDetailView').classList.add('hidden');
                document.getElementById('clubsListView').classList.remove('hidden');
            }
            showToast('Left club.', 'success');
        } else {
            console.error("[leaveClub] db.deleteMembership returned null/false. Check network tab.");
            showToast('Could not leave club. Try again.', 'error');
        }
    } catch (err) {
        console.error("[leaveClub] Critical Exception:", err);
        showToast('Error leaving club. See console.', 'error');
    }
};

