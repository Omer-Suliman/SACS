// ============================================================
// DATA LAYER (db.js) - REFACTORED FOR REST API
// ============================================================

const API_URL = 'http://localhost:5000/api';
const USER_KEY = 'sacs_user';

// Helper for fetch requests
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (!response.ok) {
            console.error(`API Error: ${method} ${endpoint} returned ${response.status}`);
            return null;
        }
        return await response.json();
    } catch (err) {
        console.error(`Fetch Error for ${method} ${endpoint}:`, err);
        return null;
    }
}

const db = {
  async hasData() { return true; },
  async writeSeed() { console.warn('Seeding handled by backend'); },

  // ---------- SESSION ----------
  async getCurrentUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  async setCurrentUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); },
  async clearCurrentUser() { localStorage.removeItem(USER_KEY); },

  // ---------- USERS ----------
  async getUsers() {
      const users = await apiCall('/users') || [];
      return users.map(u => ({ ...u, id: u._id ? u._id.toString() : u.id }));
  },
  // Sends plain-text password to backend; backend does bcrypt.compare()
  async loginUser(email, password) {
      const result = await apiCall('/users/login', 'POST', { email, password });
      if (!result) return null;
      return { ...result, id: result._id ? result._id.toString() : result.id };
  },
  async getUserById(id) { return await apiCall(`/users/${id}`); },
  async getUserByEmail(email) { return await apiCall(`/users/email/${encodeURIComponent(email)}`); },
  async addUser(user) {
      const result = await apiCall('/users/register', 'POST', user);
      if (!result) return null;
      // Normalise _id → id so a freshly registered user stored in localStorage
      // has the same .id shape as a logged-in user.
      return { ...result, id: result._id ? result._id.toString() : result.id };
  },
  async updateUser(id, patch) { return await apiCall(`/users/${id}`, 'PUT', patch); },
  async updateUserRole(userId, newRole) {
      try {
          const res = await fetch(`${API_URL}/users/${userId}/role`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: newRole })
          });
          if (!res.ok) return null;
          return await res.json();
      } catch (err) {
          console.error('Fetch Error:', err);
          return null;
      }
  },
  async deleteUser(id) { return await apiCall(`/users/${id}`, 'DELETE'); },

  // ---------- CLUBS ----------
  async getClubs() {
      const clubs = await apiCall('/clubs') || [];
      // Normalise MongoDB _id → id (as plain string) so existing frontend code still works
      return clubs.map(c => ({
          ...c,
          id: c._id ? c._id.toString() : c.id,
          createdByName: c.lead ? c.lead.name : (c.createdBy || ''),
          membersCount: Array.isArray(c.members) ? c.members.length : 0,
          members: Array.isArray(c.members) ? c.members.map(m => m._id ? m._id.toString() : m.toString()) : [],
          leadId: c.lead && c.lead._id ? c.lead._id.toString() : (c.lead ? c.lead.toString() : null)
      }));
  },
  async getClubById(id) {
      const c = await apiCall(`/clubs/${id}`);
      if (!c) return null;
      return { 
          ...c, 
          id: c._id ? c._id.toString() : c.id,
          leadId: c.lead && c.lead._id ? c.lead._id.toString() : (c.lead ? c.lead.toString() : null)
      };
  },
  async getClubsByStatus(status) {
      const clubs = await apiCall(`/clubs?status=${status}`) || [];
      return clubs.map(c => ({ ...c, id: c._id ? c._id.toString() : c.id }));
  },
  async addClub(club) {
      return await apiCall('/clubs', 'POST', club);
  },
  async joinClub(clubId, studentId) {
      try {
          const res = await fetch(`${API_URL}/clubs/join/${clubId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ studentId })
          });
          if (!res.ok) return null;
          return await res.json();
      } catch (err) {
          console.error('Fetch Error:', err);
          return null;
      }
  },
  async updateClub(id, patch) { return await apiCall(`/clubs/${id}`, 'PUT', patch); },
  // Dedicated status updater — used by the Admin Panel Approve/Reject buttons
  async updateClubStatus(clubId, status) {
      return await apiCall(`/clubs/${clubId}`, 'PUT', { status });
  },
  async deleteClub(id) { return await apiCall(`/clubs/${id}`, 'DELETE'); },

  // ---------- CLUB MEMBERSHIPS ----------
  // Memberships are embedded in Club.members[].
  // Use /clubs/myclubs/:studentId instead of the phantom /club-memberships endpoint.
  async getMembershipsByClub(clubId) {
      const club = await apiCall(`/clubs/${clubId}`);
      if (!club || !Array.isArray(club.members)) return [];
      // Return a membership-shaped array compatible with existing frontend code
      return club.members.map(m => ({
          clubId: clubId,
          studentId: m._id ? m._id.toString() : m.toString(),
          role: 'MEMBER'
      }));
  },
  async getMembershipsByStudent(studentId) {
      if (!studentId) return [];
      const clubs = await apiCall(`/clubs/myclubs/${studentId}`) || [];
      // Return membership-shaped objects compatible with clubs.js render logic
      return clubs.map(c => {
          const leadId = c.lead && c.lead._id ? c.lead._id.toString() : (c.lead ? c.lead.toString() : null);
          const isPresident = leadId === studentId.toString();
          return {
              clubId: c._id ? c._id.toString() : c.id,
              studentId: studentId,
              role: isPresident ? 'PRESIDENT' : 'MEMBER'
          };
      });
  },
  async getMembership(clubId, studentId) {
      // Check if studentId is in the club's members array
      const club = await apiCall(`/clubs/${clubId}`);
      if (!club || !Array.isArray(club.members)) return null;
      const isMember = club.members.some(m => {
          const mId = m._id ? m._id.toString() : m.toString();
          return mId === studentId.toString();
      });
      if (!isMember) return null;
      // Return a membership-shaped object
      const isLead = club.lead && club.lead._id
          ? club.lead._id.toString() === studentId.toString()
          : club.lead && club.lead.toString() === studentId.toString();
      return { clubId, studentId, role: isLead ? 'PRESIDENT' : 'MEMBER' };
  },
  async addMembership(m) {
      // Membership is handled by PUT /clubs/join/:id — this is a no-op stub
      // kept for call-site compatibility.
      return m;
  },
  async deleteMembership(clubId, studentId) {
      try {
          const res = await fetch(`${API_URL}/clubs/leave/${clubId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ studentId })
          });
          if (!res.ok) return null;
          return await res.json();
      } catch (err) {
          console.error('Fetch Error:', err);
          return null;
      }
  },

  // ---------- CLUB EVENTS ----------
  async getClubEvents(clubId) { return (await apiCall(`/club-events?clubId=${clubId}`)) || []; },
  async getClubEventById(id) { return await apiCall(`/club-events/${id}`); },
  async addClubEvent(ev) { return await apiCall('/club-events', 'POST', ev); },
  async updateClubEvent(id, patch) { return await apiCall(`/club-events/${id}`, 'PUT', patch); },
  async deleteClubEvent(id) { return await apiCall(`/club-events/${id}`, 'DELETE'); },

  // ---------- CLUB POSTS ----------
  async getClubPosts(clubId) { return (await apiCall(`/club-posts?clubId=${clubId}`)) || []; },
  async getClubPostById(id) { return await apiCall(`/club-posts/${id}`); },
  async addClubPost(post) { return await apiCall('/club-posts', 'POST', post); },
  async updateClubPost(id, patch) { return await apiCall(`/club-posts/${id}`, 'PUT', patch); },
  async deleteClubPost(id) { return await apiCall(`/club-posts/${id}`, 'DELETE'); },

  // ---------- CLUB MEDIA ----------
  async getClubMedia(clubId) { return (await apiCall(`/club-media?clubId=${clubId}`)) || []; },
  async addClubMedia(m) { return await apiCall('/club-media', 'POST', m); },
  async deleteClubMedia(id) { return await apiCall(`/club-media/${id}`, 'DELETE'); },

  // ---------- ACTIVITIES ----------
  async getActivities() {
      const acts = await apiCall('/activities') || [];
      // Normalise _id → id (as plain string) so data-id on Register/Edit/Delete buttons is correct
      return acts.map(a => ({
          ...a,
          id: a._id ? a._id.toString() : a.id,
          // Flatten populated createdBy to a plain string ID
          createdBy: a.createdBy && a.createdBy._id ? a.createdBy._id.toString() : (a.createdBy ? a.createdBy.toString() : a.createdBy),
          // Normalise registeredBy[] to plain strings for frontend comparisons
          registeredBy: Array.isArray(a.registeredBy)
              ? a.registeredBy.map(id => id._id ? id._id.toString() : id.toString())
              : []
      }));
  },
  async getActivityById(id) {
      const a = await apiCall(`/activities/${id}`);
      if (!a) return null;
      return { ...a, id: a._id ? a._id.toString() : a.id };
  },
  async addActivity(a) { 
      return await apiCall('/activities', 'POST', a); 
  },
  async updateActivity(id, patch) { return await apiCall(`/activities/${id}`, 'PUT', patch); },
  async deleteActivity(id) { return await apiCall(`/activities/${id}`, 'DELETE'); },

  // ---------- REGISTRATIONS ----------
  // Registrations are embedded in Activity.registeredBy[].
  // There is no separate /registrations collection — data lives on the Activity document.
  async getRegistrations() {
      // Returns all activities with their registeredBy arrays normalised.
      // The frontend uses this to derive isReg and regCount per activity.
      return await this.getActivities();
  },
  async getRegistrationsByActivity(activityId) {
      const a = await apiCall(`/activities/${activityId}`);
      if (!a) return [];
      return Array.isArray(a.registeredBy) ? a.registeredBy.map(id => id.toString()) : [];
  },
  async addRegistration({ activityId, user: userEmail, attended }) {
      if (!activityId) {
          console.error('[addRegistration] ERROR: activityId is undefined');
          return null;
      }
      // Resolve studentId from the stored user object
      const currentUser = await this.getCurrentUser();
      const studentId = currentUser ? (currentUser.id || currentUser._id) : null;
      if (!studentId) {
          console.error('[addRegistration] ERROR: could not resolve studentId from session');
          return null;
      }
      return await apiCall(`/activities/register/${activityId}`, 'PUT', { studentId });
  },
  async deleteRegistration(activityId, userEmail) {
      const currentUser = await this.getCurrentUser();
      const studentId = currentUser ? (currentUser.id || currentUser._id) : null;
      if (!studentId) return null;
      return await apiCall(`/activities/unregister/${activityId}`, 'PUT', { studentId });
  },
  async markAttendance(activityId, userEmail) {
      try {
          const res = await fetch(`${API_URL}/activities/${activityId}/attendance`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userEmail })
          });
          const data = await res.json();
          if (!res.ok) {
              throw new Error(data.message || `HTTP error ${res.status}`);
          }
          return data;
      } catch (err) {
          console.error('[markAttendance] Error:', err);
          throw err;
      }
  },
  // Helper: get all activities the current student has registered for
  async getMyActivities(studentId) {
      if (!studentId) return [];
      const acts = await apiCall(`/activities/registered/${studentId}`) || [];
      return acts.map(a => ({
          ...a,
          id: a._id ? a._id.toString() : a.id,
          registeredBy: Array.isArray(a.registeredBy) ? a.registeredBy.map(id => id.toString()) : []
      }));
  },

  // ---------- APPOINTMENT SLOTS ----------
  async getSlots() { 
      const slots = await apiCall('/slots') || [];
      return slots.map(s => ({
          ...s,
          // Convert ObjectId to plain string — without .toString() data-id gets "[object Object]"
          id: s._id ? s._id.toString() : s.id,
          createdByUserId: s.createdByUserId && s.createdByUserId._id
              ? s.createdByUserId._id.toString()
              : (s.createdByUserId ? s.createdByUserId.toString() : s.createdByUserId)
      }));
  },
  async getAppointmentSlots() { return await this.getSlots(); },
  async getAppointmentSlotById(id) {
      const s = await apiCall(`/slots/${id}`);
      if (!s) return null;
      return { ...s, id: s._id ? s._id.toString() : s.id };
  },
  async addAppointmentSlot(s) {
      return await apiCall('/slots', 'POST', s);
  },
  async updateAppointmentSlot(id, patch) { return await apiCall(`/slots/${id}`, 'PUT', patch); },
  async deleteAppointmentSlot(id) { return await apiCall(`/slots/${id}`, 'DELETE'); },
  async bookSlot(id, studentId) {
      if (!studentId) {
          console.error('[bookSlot] ERROR: studentId is undefined — cannot book slot', id);
          return null;
      }
      return await apiCall(`/slots/book/${id}`, 'PUT', { studentId });
  },
  async cancelAppointment(id, studentId) {
      if (!studentId) {
          console.error('[cancelAppointment] ERROR: studentId is undefined — cannot cancel slot', id);
          return null;
      }
      return await apiCall(`/slots/cancel/${id}`, 'PUT', { studentId });
  },

  // ---------- APPOINTMENTS ----------
  // Appointments = slots that a student has booked.
  // The data lives on the Slot document itself (bookedBy[] + booked count).
  // There is no separate /appointments collection — use /slots/booked/:studentId.
  async getAppointments() {
      // Returns ALL slots that have at least one booking, expanded by student.
      const slots = await apiCall('/slots') || [];
      const appointments = [];
      for (const s of slots) {
          if (Array.isArray(s.bookedBy)) {
              for (const studentId of s.bookedBy) {
                  appointments.push({
                      ...s,
                      id: s._id ? s._id.toString() : s.id,
                      slotId: s._id ? s._id.toString() : s.id,
                      studentUserId: studentId.toString()
                  });
              }
          }
      }
      return appointments;
  },
  async getAppointmentsByStudent(studentId) {
      if (!studentId) {
          console.error('[getAppointmentsByStudent] ERROR: studentId is undefined');
          return [];
      }
      const slots = await apiCall(`/slots/booked/${studentId}`) || [];
      // Normalise each slot so the rest of the frontend sees consistent shape
      return slots.map(s => ({
          ...s,
          id: s._id ? s._id.toString() : s.id,
          slotId: s._id ? s._id.toString() : s.id,
          studentUserId: studentId
      }));
  },

  // ---------- REWARDS ----------
  async getRewards() {
      const rewards = await apiCall('/rewards') || [];
      // Normalise _id → id (as plain string) so data-id on Redeem buttons is never undefined
      return rewards.map(r => ({ ...r, id: r._id ? r._id.toString() : r.id }));
  },
  async getRewardById(id) { return await apiCall(`/rewards/${id}`); },
  async addReward(r) { return await apiCall('/rewards', 'POST', r); },
  async updateReward(id, patch) { return await apiCall(`/rewards/${id}`, 'PUT', patch); },
  async deleteReward(id) { return await apiCall(`/rewards/${id}`, 'DELETE'); },
  // Claim a reward: server verifies points + stock, deducts, issues voucher
  async claimReward(rewardId, studentId) {
      return await apiCall(`/rewards/claim/${rewardId}`, 'POST', { studentId });
  },

  // ---------- PARTNERS ----------
  async getPartners() { return (await apiCall('/partners')) || []; },
  async getPartnerById(id) { return await apiCall(`/partners/${id}`); },
  async addPartner(p) { return await apiCall('/partners', 'POST', p); },
  async deletePartner(id) { return await apiCall(`/partners/${id}`, 'DELETE'); },

  // ---------- VOUCHERS ----------
  // Fetch vouchers for a student by their MongoDB _id
  async getMyVouchers(studentId) {
      return (await apiCall(`/rewards/vouchers/${studentId}`)) || [];
  },
  // Legacy helpers kept for partner-redemption flow
  async getVouchersByUser(email) { return (await apiCall(`/vouchers?user=${encodeURIComponent(email)}`)) || []; },
  async getVoucherByCode(code) { return await apiCall(`/vouchers/${code}`); },
  async addVoucher(v) { return await apiCall('/vouchers', 'POST', v); },
  async updateVoucher(code, patch) { return await apiCall(`/vouchers/${code}`, 'PUT', patch); },

  // ---------- PARTNER REDEMPTIONS ----------
  async getPartnerRedemptionsSince(ts) { return (await apiCall(`/partner-redemptions?since=${ts}`)) || []; },
  async addPartnerRedemption(r) { return await apiCall('/partner-redemptions', 'POST', r); },

  // ---------- POINTS / WALLET ----------
  async getWallet(email) { return await apiCall(`/wallet/${encodeURIComponent(email)}`); },
  async ensureWallet(email) { return await apiCall(`/wallet/${encodeURIComponent(email)}/ensure`, 'POST'); },
  async addPoints(email, amount, reason) { return await apiCall(`/wallet/${encodeURIComponent(email)}/add`, 'POST', { amount, reason }); },
  async deductPoints(email, amount, reason) { return await apiCall(`/wallet/${encodeURIComponent(email)}/deduct`, 'POST', { amount, reason }); },
  async getPointEvents(email, limit) { return (await apiCall(`/wallet/${encodeURIComponent(email)}/events?limit=${limit || 0}`)) || []; },
};

window.db = db;
