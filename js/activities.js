// activities.js
// ============================================================
// ACTIVITIES & POINTS
// ============================================================

async function renderActivities() {
    const user = await db.getCurrentUser();
    // getActivities() now returns activities with registeredBy[] normalised to plain strings.
    // getRegistrations() is an alias for getActivities() — both return the same data.
    const activities = await db.getActivities();
    const studentId = user.id || user._id;

    const isStaff = ["STAFF", "ADMIN"].includes(user.role);
    document.getElementById("staffActControls")?.classList.toggle("hidden", !isStaff);

    if (isStaff) {
        const select = document.getElementById("attendActSelect");
        if (select) select.innerHTML = '<option value="">Select Activity...</option>' + activities.map(a => `<option value="${a.id}">${a.title}</option>`).join('');
    }

    const actCatalog = document.getElementById('actCatalog');
    if (actCatalog) {
        actCatalog.innerHTML = activities.map(a => {
            // registeredBy[] is now an array of plain strings (normalised in db.getActivities)
            const registeredBy = Array.isArray(a.registeredBy) ? a.registeredBy : [];
            const regCount = registeredBy.length;
            const isReg = registeredBy.includes(studentId ? studentId.toString() : '');
            const canManage = (user.id === a.createdBy) || user.role === 'ADMIN';
            const typeTag = a.type === 'WORKSHOP' ? 'tag-workshop' : a.type === 'SPORT' ? 'tag-sport' : 'tag-general';

            let actionBtns = '';
            if (isStaff && canManage) {
                actionBtns = `<div class="flex gap-2 flex-shrink-0"><button class="btn ghost btn-sm act-edit-btn" data-id="${a.id}"><i data-feather="edit-2" style="width:13px;height:13px;"></i> Edit</button><button class="btn danger btn-sm act-delete-btn" data-id="${a.id}"><i data-feather="trash-2" style="width:13px;height:13px;"></i></button></div>`;
            } else if (user.role === 'STUDENT') {
                if (isReg) actionBtns = `<button class="btn danger btn-sm act-unreg-btn flex-shrink-0" data-id="${a.id}">Unregister</button>`;
                else if (regCount >= a.capacity) actionBtns = `<button class="btn btn-sm disabled flex-shrink-0" disabled>Full</button>`;
                else actionBtns = `<button class="btn primary btn-sm act-reg-btn flex-shrink-0" data-id="${a.id}"><i data-feather="plus" style="width:13px;height:13px;"></i> Register</button>`;
            }
            return `
            <div class="card flex justify-between items-start gap-4">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap" style="margin-bottom:0.4rem;">
                  <span class="${typeTag}">${a.type}</span>
                  <span class="chip success"><i data-feather="zap" style="width:10px;height:10px;"></i> ${a.points} pts</span>
                </div>
                <div class="font-semibold" style="color:var(--navy);font-size:0.95rem;">${a.title}</div>
                <div class="text-sm" style="color:var(--text-muted);margin-top:0.2rem;">${a.description}</div>
                <div class="text-xs flex items-center gap-1" style="color:var(--text-subtle);margin-top:0.5rem;">
                  <i data-feather="clock" style="width:11px;height:11px;"></i>
                  ${fmt.dt(a.startAt)} · ${a.location}
                </div>
                <div style="margin-top:0.4rem;">
                  <span class="badge ${regCount >= a.capacity ? 'badge-full' : 'badge-open'}">${regCount}/${a.capacity} registered</span>
                </div>
              </div>
              ${actionBtns}
            </div>`;
        }).join('') || createEmptyState("activity", "No activities", "Check back soon for upcoming events.");
    }

    const myRegs = document.getElementById('myRegs');
    if (myRegs && user.role === 'STUDENT') {
        const myActivities = activities.filter(a => {
            const registeredBy = Array.isArray(a.registeredBy) ? a.registeredBy : [];
            return registeredBy.includes(studentId ? studentId.toString() : '');
        });
        myRegs.innerHTML = myActivities.map(a => {
            const typeTag = a.type === 'WORKSHOP' ? 'tag-workshop' : a.type === 'SPORT' ? 'tag-sport' : 'tag-general';
            return `
            <div class="card flex items-start gap-3">
              <div class="slot-icon" style="background:var(--success-soft);border-color:var(--success-mid);color:var(--success);flex-shrink:0;">
                <i data-feather="check" style="width:16px;height:16px;"></i>
              </div>
              <div class="min-w-0">
                <div style="margin-bottom:0.3rem;"><span class="${typeTag}">${a.type}</span></div>
                <div class="font-semibold" style="color:var(--navy);font-size:0.9rem;">${a.title}</div>
                <div class="text-sm flex items-center gap-1" style="color:var(--text-muted);margin-top:0.25rem;">
                  <i data-feather="map-pin" style="width:11px;height:11px;"></i>
                  ${a.location} · ${fmt.dt(a.startAt)}
                </div>
              </div>
            </div>`;
        }).join('') || createEmptyState("bookmark", "No registrations", "You haven't registered for any activities.");
    }

    if (typeof feather !== 'undefined') feather.replace();
}
