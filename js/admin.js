// admin.js
// ============================================================
// ADMIN & PARTNER
// ============================================================

async function renderAdmin() {
    const user = await db.getCurrentUser();
    if (user.role !== "ADMIN") { document.querySelector('[data-page="admin"]').innerHTML = 'Access Denied'; return; }

    const users = await db.getUsers();
    const pendingClubs = await db.getClubsByStatus('PENDING');

    const roleColors = { STUDENT:'background:#ede9fe;color:#5b21b6;', DOCTOR:'background:#d1fae5;color:var(--success);', STAFF:'background:var(--warn-mid);color:var(--warn);', ADMIN:'background:#f3e8ff;color:#6d28d9;', PARTNER:'background:var(--accent-soft);color:var(--accent);' };
    document.getElementById("adminUserTable").innerHTML = users.map(u => {
        const initial = u.name.charAt(0).toUpperCase();
        const roleStyle = roleColors[u.role] || 'background:var(--bg-subtle);color:var(--navy);';
        return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.65rem;">
            <div style="width:30px;height:30px;border-radius:var(--r-full);background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0;">${initial}</div>
            <span style="font-weight:500;color:var(--navy);font-size:0.875rem;">${u.name}</span>
          </div>
        </td>
        <td style="color:var(--text-muted);font-size:0.875rem;">${u.email}</td>
        <td>
          <select class="admin-role-select" style="width:auto;padding:0.3rem 0.5rem;font-size:0.8rem;border-radius:var(--r-sm);" data-id="${u.id || u._id}" onchange="window.updateUserRole(this, '${u.id || u._id}')">
            ${['STUDENT', 'DOCTOR', 'STAFF', 'ADMIN', 'PARTNER'].map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </td>
        <td>
          <button class="btn danger btn-sm admin-del-user" data-id="${u.id}">
            <i data-feather="trash-2" style="width:12px;height:12px;"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    document.getElementById("adminPendingClubs").innerHTML = pendingClubs.map(c => {
        const initial = c.name.charAt(0).toUpperCase();
        return `
        <div class="card flex justify-between items-center gap-4" style="padding:1rem 1.25rem;">
          <div class="flex items-center gap-3 min-w-0">
            <div class="club-avatar" style="width:38px;height:38px;background:var(--warn-mid);color:var(--warn);font-size:0.95rem;">${initial}</div>
            <div class="min-w-0">
              <div class="font-semibold" style="color:var(--navy);font-size:0.9rem;">${c.name}</div>
              <div class="text-xs" style="color:var(--text-muted);margin-top:0.15rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:30ch;">${c.description}</div>
            </div>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button class="btn success btn-sm admin-club-action" data-id="${c.id}" data-action="APPROVED">
              <i data-feather="check" style="width:13px;height:13px;"></i> Approve
            </button>
            <button class="btn danger btn-sm admin-club-action" data-id="${c.id}" data-action="REJECTED">
              <i data-feather="x" style="width:13px;height:13px;"></i> Reject
            </button>
          </div>
        </div>`;
    }).join('') || createEmptyState("check-circle", "All caught up", "No pending clubs to review.");

    await renderAdminRewardsPartners();

    if (typeof feather !== 'undefined') feather.replace();
}

async function renderAdminRewardsPartners() {
    const rewards = await db.getRewards();
    const partners = await db.getPartners();

    document.getElementById('rewardPartner').innerHTML = partners.map(p => `<option value="${p.id}">${p.name}</option>`).join('') || '<option value="" disabled>No partners</option>';
    document.getElementById('adminRewardsList').innerHTML = rewards.map(r => {
        const typeLabel = r.type === 'PERCENT' ? `${r.value}% off` : r.type === 'AMOUNT' ? `₺${r.value} off` : r.name;
        return `
        <div class="card flex justify-between items-center gap-3" style="padding:0.875rem 1.1rem;">
          <div class="min-w-0">
            <div class="font-semibold" style="color:var(--navy);font-size:0.875rem;">${r.name}</div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.3rem;flex-wrap:wrap;">
              <span class="chip">${r.costPoints} pts</span>
              <span class="chip accent">${typeLabel}</span>
              ${r.stock !== undefined ? `<span class="chip">Stock: ${r.stock}</span>` : ''}
            </div>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button type="button" class="btn ghost btn-sm" onclick="window.editReward('${r.id}')">
              <i data-feather="edit-2" style="width:12px;height:12px;"></i> Edit
            </button>
            <button type="button" class="btn danger btn-sm" onclick="window.deleteReward('${r.id}')">
              <i data-feather="trash-2" style="width:12px;height:12px;"></i>
            </button>
          </div>
        </div>`;
    }).join('');
    document.getElementById('adminPartnersList').innerHTML = partners.map(p => `
        <div class="card flex justify-between items-center gap-3" style="padding:0.875rem 1.1rem;">
          <div class="flex items-center gap-2">
            <i data-feather="briefcase" style="width:14px;height:14px;color:var(--text-subtle);"></i>
            <span class="font-semibold" style="color:var(--navy);font-size:0.875rem;">${p.name}</span>
          </div>
          <button type="button" class="btn danger btn-sm" onclick="window.deletePartner('${p.id}')">
            <i data-feather="trash-2" style="width:12px;height:12px;"></i>
          </button>
        </div>`).join('');

    if (typeof feather !== 'undefined') feather.replace();
}

async function renderPartner() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const redemptions = await db.getPartnerRedemptionsSince(today.getTime());
    document.getElementById('partnerHistory').innerHTML = redemptions.map(r => `
      <div class="card flex items-center gap-3" style="padding:0.875rem 1.25rem;">
        <div style="width:36px;height:36px;border-radius:var(--r-md);background:var(--success-soft);border:1px solid var(--success-mid);color:var(--success);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i data-feather="check-circle" style="width:16px;height:16px;"></i>
        </div>
        <div class="min-w-0">
          <div style="font-family:'Courier New',monospace;font-weight:700;color:var(--navy);font-size:0.925rem;letter-spacing:0.08em;">${r.voucherCode}</div>
          <div class="text-xs flex items-center gap-1" style="color:var(--text-subtle);margin-top:0.15rem;">
            <i data-feather="clock" style="width:11px;height:11px;"></i>
            Redeemed at ${fmt.dt(r.redeemedAt)}
          </div>
        </div>
        <span class="badge badge-approved" style="margin-left:auto;flex-shrink:0;">Redeemed</span>
      </div>`).join('') || createEmptyState("inbox", "No redemptions", "No redemptions recorded today.");

    if (typeof feather !== 'undefined') feather.replace();
}

window.updateUserRole = async function(selectEl, userId) {
    const newRole = selectEl.value;
    selectEl.disabled = true;
    try {
        const result = await db.updateUserRole(userId, newRole);
        if (result) {
            if (typeof showToast === 'function') showToast('Role updated successfully', 'success');
        } else {
            console.error(`[updateUserRole] Failed to update user ${userId}`);
            if (typeof showToast === 'function') showToast('Failed to update role', 'error');
            await renderAdmin();
        }
    } catch (err) {
        console.error("[updateUserRole] Critical exception:", err);
        if (typeof showToast === 'function') showToast('Error updating role', 'error');
        await renderAdmin();
    } finally {
        selectEl.disabled = false;
    }
};

window.addPartner = async function() {
    const nameInput = document.getElementById('partnerName');
    const name = nameInput.value.trim();
    if (!name) {
        showToast('Partner name is required', 'error');
        return;
    }
    try {
        const result = await db.addPartner({ name });
        if (result) {
            showToast('Partner added successfully', 'success');
            nameInput.value = '';
            await renderAdminRewardsPartners();
        } else {
            showToast('Failed to add partner', 'error');
        }
    } catch (err) {
        console.error('Error adding partner:', err);
        showToast('Error adding partner', 'error');
    }
};

window.submitReward = async function() {
    const name = document.getElementById('rewardName').value.trim();
    const type = document.getElementById('rewardType').value;
    const value = document.getElementById('rewardValue').value;
    const costPoints = document.getElementById('rewardCost').value;
    const minSpend = document.getElementById('rewardMinSpend').value;
    const validDays = document.getElementById('rewardValidDays').value;
    const stock = document.getElementById('rewardStock').value;
    
    const partnerSelect = document.getElementById('rewardPartner');
    const partnerId = partnerSelect.value;
    const partnerName = partnerSelect.options[partnerSelect.selectedIndex]?.text || '';

    if (!name || !costPoints || !partnerId) {
        showToast('Name, Cost Points, and Partner are required', 'error');
        return;
    }

    const user = await db.getCurrentUser();

    const payload = {
        name,
        type,
        value: Number(value) || 0,
        costPoints: Number(costPoints) || 0,
        minSpend: Number(minSpend) || 0,
        validDays: Number(validDays) || 30,
        partnerName,
        stock: stock !== '' ? Number(stock) : 99, 
        role: user.role
    };

    try {
        if (editingRewardId) {
            const result = await db.updateReward(editingRewardId, payload);
            if (result) {
                showToast('Reward updated successfully', 'success');
                window.cancelEditReward();
                await renderAdminRewardsPartners();
            } else {
                showToast('Failed to update reward', 'error');
            }
        } else {
            const result = await db.addReward(payload);
            if (result) {
                showToast('Reward added successfully', 'success');
                document.getElementById('rewardForm').reset();
                await renderAdminRewardsPartners();
            } else {
                showToast('Failed to add reward', 'error');
            }
        }
    } catch (err) {
        console.error('Error submitting reward:', err);
        showToast('Error submitting reward', 'error');
    }
};

window.verifyVoucher = async function() {
    const code = document.getElementById('redeemCode').value.trim().toUpperCase();
    const resultDiv = document.getElementById('partnerResult');
    if (!code) {
        if (typeof showToast === 'function') showToast('Please enter a voucher code', 'error');
        return;
    }
    resultDiv.innerHTML = '<span class="text-gray-500">Verifying...</span>';
    try {
        const voucher = await db.getVoucherByCode(code);
        if (!voucher) {
            resultDiv.innerHTML = '<span class="text-red-600">Voucher not found.</span>';
            return;
        }
        if (voucher.status === 'REDEEMED') {
            resultDiv.innerHTML = `<span class="text-red-600">Already Redeemed (Code: ${code})</span>`;
        } else {
            resultDiv.innerHTML = `<span class="text-green-600">Valid: ${voucher.rewardName || 'Reward'}</span>`;
        }
    } catch (err) {
        console.error('Verify Error:', err);
        resultDiv.innerHTML = '<span class="text-red-600">Error verifying voucher.</span>';
    }
};

window.redeemVoucher = async function() {
    const code = document.getElementById('redeemCode').value.trim().toUpperCase();
    const resultDiv = document.getElementById('partnerResult');
    if (!code) {
        if (typeof showToast === 'function') showToast('Please enter a voucher code', 'error');
        return;
    }
    
    try {
        const voucher = await db.getVoucherByCode(code);
        if (!voucher) {
            resultDiv.innerHTML = '<span class="text-red-600">Voucher not found.</span>';
            return;
        }
        if (voucher.status === 'REDEEMED') {
            resultDiv.innerHTML = `<span class="text-red-600">Cannot redeem. Already marked as USED.</span>`;
            return;
        }

        const updated = await db.updateVoucher(code, { status: 'REDEEMED' });
        if (updated) {
            await db.addPartnerRedemption({ voucherCode: code });
            
            resultDiv.innerHTML = `<span class="text-green-600">Successfully redeemed: ${voucher.rewardName || 'Reward'}</span>`;
            document.getElementById('redeemCode').value = '';
            if (typeof showToast === 'function') showToast('Voucher redeemed!', 'success');
            
            if (typeof renderPartner === 'function') await renderPartner();
        } else {
            resultDiv.innerHTML = '<span class="text-red-600">Failed to redeem voucher.</span>';
        }
    } catch (err) {
        console.error('Redeem Error:', err);
        resultDiv.innerHTML = '<span class="text-red-600">Error redeeming voucher.</span>';
    }
};

window.deletePartner = function(partnerId) {
    window.customConfirmDelete("Delete Partner", "Are you sure you want to delete this partner? This action cannot be undone.", async () => {
        try {
            await db.deletePartner(partnerId);
            if (typeof renderAdminRewardsPartners === 'function') await renderAdminRewardsPartners();
            if (typeof showToast === 'function') showToast('Partner deleted successfully', 'success');
        } catch (err) {
            console.error('Error deleting partner:', err);
            if (typeof showToast === 'function') showToast('Error deleting partner', 'error');
        }
    });
};

window.deleteReward = function(rewardId) {
    window.customConfirmDelete("Delete Reward", "Are you sure you want to delete this reward? This action cannot be undone.", async () => {
        try {
            await db.deleteReward(rewardId);
            if (typeof renderAdminRewardsPartners === 'function') await renderAdminRewardsPartners();
            if (typeof showToast === 'function') showToast('Reward deleted successfully', 'success');
        } catch (err) {
            console.error('Error deleting reward:', err);
            if (typeof showToast === 'function') showToast('Error deleting reward', 'error');
        }
    });
};

window.editReward = async function(rewardId) {
    const reward = await db.getRewardById(rewardId);
    if (!reward) {
        if (typeof showToast === 'function') showToast('Reward not found', 'error');
        return;
    }
    
    editingRewardId = rewardId;
    
    document.getElementById('rewardName').value = reward.name || '';
    document.getElementById('rewardType').value = reward.type || 'PERCENT';
    document.getElementById('rewardValue').value = reward.value || '';
    document.getElementById('rewardCost').value = reward.costPoints || '';
    document.getElementById('rewardMinSpend').value = reward.minSpend || '';
    document.getElementById('rewardValidDays').value = reward.validDays || '';
    document.getElementById('rewardStock').value = reward.stock !== undefined ? reward.stock : '';
    
    const partnerSelect = document.getElementById('rewardPartner');
    for (let i = 0; i < partnerSelect.options.length; i++) {
        if (partnerSelect.options[i].text === reward.partnerName) {
            partnerSelect.selectedIndex = i;
            break;
        }
    }

    document.getElementById('submitRewardText').textContent = 'Save Changes';
    document.getElementById('submitRewardIconAdd').classList.add('hidden');
    document.getElementById('submitRewardIconEdit').classList.remove('hidden');
    document.getElementById('cancelEditRewardBtn').classList.remove('hidden');

    document.getElementById('rewardForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.cancelEditReward = function() {
    editingRewardId = null;
    document.getElementById('rewardForm').reset();
    document.getElementById('submitRewardText').textContent = 'Add Reward';
    document.getElementById('submitRewardIconEdit').classList.add('hidden');
    document.getElementById('submitRewardIconAdd').classList.remove('hidden');
    document.getElementById('cancelEditRewardBtn').classList.add('hidden');
};
