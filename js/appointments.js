// appointments.js
// ============================================================
// APPOINTMENTS (QUEUE)
// ============================================================

async function renderQueue() {
    const user = await db.getCurrentUser();
    const slots = await db.getSlots();
    const appointments = await db.getAppointments();

    const listEl = document.getElementById('appointmentSlotsList');
    if (listEl) {
        const today = new Date().toISOString().slice(0, 10);
        const futureSlots = slots.filter(s => s.date >= today).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

        listEl.innerHTML = futureSlots.map(s => {
            const isStudent = user.role === "STUDENT";
            const alreadyBooked = appointments.some(a => a.slotId === s.id && a.studentUserId === user.id);
            const full = s.booked >= s.capacity;
            let btnHtml = "";
            if (isStudent) {
                if (alreadyBooked) btnHtml = `<button class="btn danger btn-sm slot-cancel-btn" data-id="${s.id}"><i data-feather="x" style="width:13px;height:13px;"></i> Cancel</button>`;
                else if (!full) btnHtml = `<button class="btn primary btn-sm slot-book-btn" data-id="${s.id}"><i data-feather="check" style="width:13px;height:13px;"></i> Book</button>`;
                else btnHtml = `<button class="btn btn-sm disabled" disabled>Full</button>`;
            } else {
                btnHtml = `<span class="badge ${full ? 'badge-full' : 'badge-open'}">${full ? 'Full' : 'Open'}</span>`;
            }
            return `
            <div class="slot-card flex justify-between items-center gap-4">
              <div class="flex items-start gap-3 min-w-0">
                <div class="slot-icon"><i data-feather="calendar" style="width:16px;height:16px;"></i></div>
                <div class="min-w-0">
                  <div class="font-semibold" style="color:var(--navy);font-size:0.925rem;">${s.office}</div>
                  <div class="text-sm" style="color:var(--text-muted);margin-top:0.15rem;">${s.date} · ${s.startTime}–${s.endTime}</div>
                  <div class="flex items-center gap-2 flex-wrap" style="margin-top:0.4rem;">
                    <span style="font-size:0.75rem;color:var(--text-subtle);">By ${s.createdByName}</span>
                    <span class="badge ${full ? 'badge-full' : 'badge-open'}">${s.booked}/${s.capacity} booked</span>
                  </div>
                </div>
              </div>
              <div class="flex-shrink-0">${btnHtml}</div>
            </div>`;
        }).join('') || createEmptyState("calendar", "No available appointments", "There are no open slots at this time.");
    }

    const mySlotsEl = document.getElementById('mySlotsList');
    if (mySlotsEl) {
        const headingEl = mySlotsEl.previousElementSibling;
        
        if (["DOCTOR", "STAFF", "ADMIN"].includes(user.role)) {
            if (headingEl && headingEl.tagName === 'H3') {
                headingEl.innerHTML = '<i data-feather="clock" class="w-4 h-4 text-accent"></i> My Published Slots';
            }
            const mySlots = slots.filter(s => s.createdByUserId === user.id);
            mySlotsEl.innerHTML = mySlots.map(s => `
            <div class="slot-card flex justify-between items-center gap-4">
              <div class="flex items-start gap-3 min-w-0">
                <div class="slot-icon" style="background:var(--accent-soft);border-color:var(--accent-soft);color:var(--accent);"><i data-feather="clock" style="width:16px;height:16px;"></i></div>
                <div class="min-w-0">
                  <div class="font-semibold" style="color:var(--navy);font-size:0.925rem;">${s.office}</div>
                  <div class="text-sm" style="color:var(--text-muted);margin-top:0.15rem;">${s.date} · ${s.startTime}–${s.endTime}</div>
                  <div style="margin-top:0.4rem;">
                    <span class="badge badge-booked">${s.booked}/${s.capacity} booked</span>
                  </div>
                </div>
              </div>
              <div class="flex gap-2 flex-shrink-0">
                <button class="btn ghost btn-sm slot-edit-btn" data-id="${s.id}"><i data-feather="edit-2" style="width:13px;height:13px;"></i> Edit</button>
                <button class="btn danger btn-sm slot-delete-btn" data-id="${s.id}"><i data-feather="trash-2" style="width:13px;height:13px;"></i></button>
              </div>
            </div>`).join('') || createEmptyState("clock", "No published slots", "You haven't published any office hours.");
        } else if (user.role === "STUDENT") {
            if (headingEl && headingEl.tagName === 'H3') {
                headingEl.innerHTML = '<i data-feather="bookmark" class="w-4 h-4 text-accent"></i> My Booked Slots';
            }
            const myBookedSlots = slots.filter(s => s.bookedBy && s.bookedBy.includes(user.id));
            mySlotsEl.innerHTML = myBookedSlots.map(s => `
            <div class="slot-card flex justify-between items-center gap-4">
              <div class="flex items-start gap-3 min-w-0">
                <div class="slot-icon" style="background:var(--accent-soft);border-color:var(--accent-soft);color:var(--accent);"><i data-feather="calendar" style="width:16px;height:16px;"></i></div>
                <div class="min-w-0">
                  <div class="font-semibold" style="color:var(--navy);font-size:0.925rem;">${s.office}</div>
                  <div class="text-sm" style="color:var(--text-muted);margin-top:0.15rem;">${s.date} · ${s.startTime}–${s.endTime}</div>
                  <div class="flex items-center gap-2 flex-wrap" style="margin-top:0.4rem;">
                    <span style="font-size:0.75rem;color:var(--text-subtle);">By ${s.createdByName}</span>
                  </div>
                </div>
              </div>
              <div class="flex gap-2 flex-shrink-0">
                <button class="btn danger btn-sm slot-cancel-btn" data-id="${s.id}"><i data-feather="x" style="width:13px;height:13px;"></i> Cancel</button>
              </div>
            </div>`).join('') || createEmptyState("calendar", "No appointments", "You haven't booked any office hours.");
        } else {
            mySlotsEl.innerHTML = '<p class="text-gray-400 text-sm italic">Area unavailable.</p>';
        }
    }

    if (typeof feather !== 'undefined') feather.replace();
}
