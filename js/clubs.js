// clubs.js
// ============================================================
// CLUBS
// ============================================================

async function renderClubs() {
    const user = await db.getCurrentUser();
    const clubs = await db.getClubs();
    const allMemberships = await db.getMembershipsByStudent(user.id);

    const listView = document.getElementById('clubsListView');
    const detailView = document.getElementById('clubDetailView');
    if (listView) listView.classList.remove('hidden');
    if (detailView) detailView.classList.add('hidden');

    const createWrap = document.getElementById("clubCreateWrap");
    if (createWrap) createWrap.classList.toggle('hidden', editingClubId === null);

    document.getElementById('btnShowCreateClub')?.classList.toggle('hidden', user.role !== 'STUDENT');

    const approvedClubs = clubs.filter(c => c.status === 'APPROVED');
    document.getElementById('myClubsCount').textContent = String(allMemberships.length);
    document.getElementById('allClubsCount').textContent = String(approvedClubs.length);

    const myClubsList = document.getElementById('clubListMy');
    if (myClubsList) {
        myClubsList.innerHTML = allMemberships.map(m => {
            const c = clubs.find(cl => cl.id === m.clubId);
            if (!c) return '';
            const isPresident = m.role === 'PRESIDENT';
            const roleBadge = `<span class="role-badge ${isPresident ? 'leader' : 'member'}">${isPresident ? 'Leader' : 'Member'}</span>`;
            const initial = c.name.charAt(0).toUpperCase();
            const avatarColor = isPresident ? 'background:var(--accent);' : 'background:var(--navy);';
            let leaveBtn = (!isPresident && user.role === 'STUDENT') ? `<button type="button" class="btn danger btn-sm w-full" style="margin-top:0.75rem;" onclick="event.stopPropagation(); window.leaveClub('${c.id || c._id}')"><i data-feather="log-out" style="width:13px;height:13px;"></i> Leave Club</button>` : '';
            return `
            <div class="club-card" data-id="${c.id}">
              <div class="flex items-start gap-3">
                <div class="club-avatar" style="${avatarColor}">${initial}</div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <div class="font-semibold" style="color:var(--navy);font-size:0.975rem;line-height:1.3;">${c.name}</div>
                    ${roleBadge}
                  </div>
                  ${c.status === 'PENDING' ? '<span class="badge badge-pending" style="margin-top:0.35rem;">Pending approval</span>' : ''}
                </div>
              </div>
              ${leaveBtn}
            </div>`;
        }).join('') || createEmptyState("users", "No clubs joined", "You are not a member of any club yet.");
    }

    const approvedList = document.getElementById('clubListApproved');
    if (approvedList) {
        // Fix for club member count
        const allSystemMemberships = []; // It's heavy to load all if db gets big, but for now we iterate
        for (const c of approvedClubs) {
            const m = await db.getMembershipsByClub(c.id);
            c._memCount = m.length;
        }

        approvedList.innerHTML = approvedClubs.map(c => {
            const membership = allMemberships.find(m => m.clubId === c.id);
            const isMember = !!membership;
            const isPresident = isMember && membership.role === 'PRESIDENT';
            const initial = c.name.charAt(0).toUpperCase();

            let actionHtml = '';
            if (user.role === 'ADMIN') {
                actionHtml = `<div class="flex gap-2 justify-end" style="margin-top:0.75rem;">
                  <button type="button" class="btn danger btn-sm" onclick="event.stopPropagation(); window.deleteClub('${c.id}')"><i data-feather="trash-2" style="width:13px;height:13px;"></i></button>
                </div>`;
            } else if (user.role === 'STUDENT') {
                if (!isMember) actionHtml = `<button type="button" class="btn primary btn-sm w-full join-club-btn" style="margin-top:0.75rem;" onclick="event.stopPropagation(); window.joinClub('${c.id || c._id}')"><i data-feather="plus" style="width:13px;height:13px;"></i> Join Club</button>`;
                else if (isPresident) actionHtml = `<div style="margin-top:0.75rem;"><span class="role-badge leader">Leader</span></div>`;
            } else if (isMember) {
                actionHtml = `<div style="margin-top:0.75rem;"><span class="badge badge-active">Joined</span></div>`;
            }

            return `
            <div class="club-card" data-id="${c.id}">
              <div class="flex items-start gap-3">
                <div class="club-avatar">${initial}</div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <div class="font-semibold" style="color:var(--navy);font-size:0.975rem;line-height:1.3;">${c.name}</div>
                    ${isMember && !isPresident && user.role !== 'ADMIN' ? '<span class="badge badge-active" style="flex-shrink:0;">Joined</span>' : ''}
                  </div>
                  <div class="flex items-center gap-1 text-xs" style="color:var(--text-subtle);margin-top:0.3rem;">
                    <i data-feather="users" style="width:11px;height:11px;"></i>
                    ${c._memCount} member${c._memCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              ${actionHtml}
            </div>`;
        }).join('') || createEmptyState("grid", "No approved clubs", "Check back later for new clubs.");
    }

    if (typeof feather !== 'undefined') feather.replace();
}

// ============================================================
// CLUB DETAIL VIEW
// ============================================================

async function openClubDetail(clubId) {
    const club = await db.getClubById(clubId);
    if (!club) return;
    currentClubId = clubId;

    document.getElementById('clubsListView').classList.add('hidden');
    document.getElementById('clubDetailView').classList.remove('hidden');

    document.getElementById('clubDetailName').textContent = club.name;
    const creator = await db.getUserById(club.createdBy);
    document.getElementById('clubDetailCreatedBy').textContent = creator ? `Created by ${creator.name}` : '';

    const statusEl = document.getElementById('clubDetailStatus');
    statusEl.className = 'chip';
    if (club.status === 'APPROVED') { statusEl.classList.add('bg-blue-100', 'text-blue-800'); statusEl.textContent = 'approved'; }
    else if (club.status === 'PENDING') { statusEl.classList.add('bg-yellow-100', 'text-yellow-800'); statusEl.textContent = 'pending'; }

    const user = await db.getCurrentUser();
    const actionsEl = document.getElementById('clubDetailActions');
    actionsEl.innerHTML = '';

    const mem = await db.getMembership(clubId, user.id);
    const userId = user._id ? user._id.toString() : user.id;
    const isLeader = club.leadId === userId;

    actionsEl.innerHTML = `
        <button id="editClubBtn" class="btn primary hidden" onclick="window.openClubEditModal('${clubId}')"><i data-feather="edit"></i> Edit</button>
        <button id="leaveClubBtn" type="button" class="btn danger hidden" onclick="window.leaveClub('${clubId}')">Leave</button>
    `;

    if (isLeader || user.role === 'ADMIN') {
        document.getElementById('editClubBtn').classList.remove('hidden');
    }
    if (mem && !isLeader) {
        document.getElementById('leaveClubBtn').classList.remove('hidden');
    }
    await switchClubTab('overview');
    feather.replace();
}

async function switchClubTab(tab) {
    document.querySelectorAll('#clubTabNav .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'overview') await renderClubOverview();
    else if (tab === 'events') await renderClubEvents();
    else if (tab === 'posts') await renderClubPosts();
    else if (tab === 'members') await renderClubMembers();
    else if (tab === 'about') await renderClubAbout();
    feather.replace();
}

async function renderClubOverview() {
    const club = await db.getClubById(currentClubId);
    const mems = await db.getMembershipsByClub(currentClubId);
    const evs = await db.getClubEvents(currentClubId);

    document.getElementById('clubTabContent').innerHTML = `
        <div class="grid sm:grid-cols-3 gap-4" style="margin-bottom:1.25rem;">
            <div class="card text-center" style="padding:1.25rem;">
                <div class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-subtle);">Members</div>
                <div style="font-family:'Fraunces',serif;font-size:2rem;font-weight:400;color:var(--navy);line-height:1.1;margin:0.35rem 0;">${mems.length}</div>
            </div>
            <div class="card text-center" style="padding:1.25rem;">
                <div class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-subtle);">Events</div>
                <div style="font-family:'Fraunces',serif;font-size:2rem;font-weight:400;color:var(--navy);line-height:1.1;margin:0.35rem 0;">${evs.length}</div>
            </div>
        </div>
        <div class="card">
            <p class="font-semibold" style="color:var(--navy);margin-bottom:0.6rem;">About this Club</p>
            <p style="color:var(--text-muted);line-height:1.7;font-size:0.925rem;">${club.description}</p>
        </div>`;

    if (typeof feather !== 'undefined') feather.replace();
}

async function renderClubEvents() {
    const user = await db.getCurrentUser();
    const club = await db.getClubById(currentClubId);
    const userId = user._id ? user._id.toString() : user.id;
    const isLeader = club.leadId === userId;
    const canEdit = isLeader || user.role === 'ADMIN';
    const events = await db.getClubEvents(currentClubId);

    let html = `<button id="createEventBtn" class="btn primary btn-sm hidden" style="margin-bottom:1rem;" onclick="window.openClubEventModal('${currentClubId}')"><i data-feather="plus" style="width:13px;height:13px;"></i> Create Event</button>`;
    const eventList = events.map(e => `
        <div class="card flex justify-between items-start gap-4" style="margin-bottom:0.65rem;">
          <div class="flex items-start gap-3 min-w-0">
            <div class="slot-icon" style="flex-shrink:0;"><i data-feather="calendar" style="width:15px;height:15px;"></i></div>
            <div class="min-w-0">
              <div class="font-semibold" style="color:var(--navy);font-size:0.9rem;">${e.title}</div>
              <div class="text-sm flex items-center gap-1" style="color:var(--text-muted);margin-top:0.2rem;">
                <i data-feather="clock" style="width:11px;height:11px;"></i> ${fmt.dt(e.startAt)}
              </div>
              ${e.location ? `<div class="text-xs flex items-center gap-1" style="color:var(--text-subtle);margin-top:0.2rem;"><i data-feather="map-pin" style="width:11px;height:11px;"></i> ${e.location}</div>` : ''}
            </div>
          </div>
          ${canEdit ? `<button type="button" class="btn danger btn-sm flex-shrink-0" onclick="window.deleteClubEvent('${e._id || e.id}')"><i data-feather="trash-2" style="width:13px;height:13px;"></i></button>` : ''}
        </div>`).join('');
    html += eventList || createEmptyState("calendar", "No events scheduled", "This club hasn't planned any events yet.");
    document.getElementById('clubTabContent').innerHTML = html;

    if (canEdit) {
        document.getElementById('createEventBtn').classList.remove('hidden');
    }

    if (typeof feather !== 'undefined') feather.replace();
}

async function renderClubPosts() {
    const user = await db.getCurrentUser();
    const club = await db.getClubById(currentClubId);
    const userId = user._id ? user._id.toString() : user.id;
    const isLeader = club.leadId === userId;
    const canEdit = isLeader || user.role === 'ADMIN';
    const posts = await db.getClubPosts(currentClubId);

    let html = `<button id="createPostBtn" class="btn primary btn-sm hidden" style="margin-bottom:1rem;" onclick="window.openClubPostModal('${currentClubId}')"><i data-feather="plus" style="width:13px;height:13px;"></i> Create Post</button>`;
    const postList = posts.map(p => `
        <div class="card" style="margin-bottom:0.65rem;">
          <div class="flex justify-between items-start gap-4">
            <div class="flex items-center gap-2 min-w-0">
              <i data-feather="file-text" style="width:14px;height:14px;color:var(--text-subtle);flex-shrink:0;"></i>
              <div class="font-semibold" style="color:var(--navy);font-size:0.925rem;">${p.title}</div>
            </div>
            ${canEdit ? `<button type="button" class="btn danger btn-sm flex-shrink-0" onclick="window.deleteClubPost('${p._id || p.id}')"><i data-feather="trash-2" style="width:13px;height:13px;"></i></button>` : ''}
          </div>
          <p style="color:var(--text-muted);font-size:0.875rem;line-height:1.65;margin-top:0.65rem;">${p.content}</p>
        </div>`).join('');
    html += postList || createEmptyState("message-square", "No posts yet", "Be the first to post an update!");
    document.getElementById('clubTabContent').innerHTML = html;

    if (canEdit) {
        document.getElementById('createPostBtn').classList.remove('hidden');
    }

    if (typeof feather !== 'undefined') feather.replace();
}

async function renderClubMembers() {
    const mems = await db.getMembershipsByClub(currentClubId);
    const users = await db.getUsers();
    const club = await db.getClubById(currentClubId);

    document.getElementById('clubTabContent').innerHTML = mems.map(m => {
        const u = users.find(x => x.id === m.studentId);
        if (!u) return '';
        const isLeader = club.leadId === m.studentId;
        const initial = u.name.charAt(0).toUpperCase();
        const avatarStyle = isLeader
            ? 'background:var(--accent);color:#fff;'
            : 'background:var(--bg-subtle);color:var(--navy);border:1px solid var(--border);';
        return `
        <div class="card flex justify-between items-center gap-3" style="padding:0.875rem 1.25rem;margin-bottom:0.5rem;">
          <div class="flex items-center gap-3">
            <div style="width:34px;height:34px;border-radius:var(--r-full);${avatarStyle}display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.875rem;flex-shrink:0;">${initial}</div>
            <div>
              <div class="font-medium" style="color:var(--navy);font-size:0.9rem;">${u.name}</div>
              <div class="text-xs" style="color:var(--text-subtle);">${u.email}</div>
            </div>
          </div>
          <span class="role-badge ${isLeader ? 'leader' : 'member'}">${isLeader ? 'Leader' : 'Member'}</span>
        </div>`;
    }).join('');

    if (typeof feather !== 'undefined') feather.replace();
}

async function renderClubAbout() {
    const club = await db.getClubById(currentClubId);
    document.getElementById('clubTabContent').innerHTML = `
        <div class="card">
            <p class="font-semibold" style="color:var(--navy);margin-bottom:1.1rem;display:flex;align-items:center;gap:0.5rem;">
                <i data-feather="map-pin" style="width:15px;height:15px;color:var(--text-muted);"></i>
                Meeting Details
            </p>
            <div class="grid grid-cols-2 gap-5">
                <div>
                    <div class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-subtle);margin-bottom:0.3rem;">Days</div>
                    <div class="font-semibold" style="color:var(--navy);">${club.meetingDays || 'TBA'}</div>
                </div>
                <div>
                    <div class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-subtle);margin-bottom:0.3rem;">Time</div>
                    <div class="font-semibold" style="color:var(--navy);">${club.meetingTime || 'TBA'}</div>
                </div>
                <div class="col-span-2">
                    <div class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-subtle);margin-bottom:0.3rem;">Location</div>
                    <div class="font-semibold" style="color:var(--navy);">${club.location || 'TBA'}</div>
                </div>
            </div>
        </div>`;

    if (typeof feather !== 'undefined') feather.replace();
}
