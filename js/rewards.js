// rewards.js
// ============================================================
// REWARDS & WALLET
// ============================================================

async function renderRewards() {
    const user = await db.getCurrentUser();
    const rewards = await db.getRewards();
    const studentId = user._id || user.id;

    if (user.role === 'STUDENT') {
        // Fetch live points from the User document via the wallet endpoint
        const wallet = await db.getWallet(user.email);
        // Fetch this student's issued vouchers from the new MongoDB-backed endpoint
        const vouchers = await db.getMyVouchers(studentId);

        // Points balance panel
        const balance = wallet?.balance ?? user.points ?? 0;
        const lifetime = wallet?.lifetime ?? balance;
        document.getElementById('wallet').innerHTML = `
          <div class="wallet-card">
            <div class="wallet-label">CampusCoin Balance</div>
            <div class="wallet-balance">${balance} <span style="font-size:1.25rem;opacity:0.7;font-family:'Inter',sans-serif;font-weight:400;">pts</span></div>
            <div class="wallet-lifetime" style="margin-top:0.5rem;">
              <i data-feather="trending-up" style="width:13px;height:13px;display:inline;vertical-align:middle;margin-right:4px;opacity:0.7;"></i>
              ${lifetime} pts lifetime earned
            </div>
          </div>`;

        // Rewards catalogue — grey out anything the student can't afford or is out of stock
        document.getElementById('rewardsList').innerHTML = rewards.map(r => {
            const canAfford = balance >= r.costPoints;
            const inStock   = (r.stock ?? 1) > 0;
            const available = canAfford && inStock;
            const typeIcon  = r.type === 'PERCENT' ? '%' : r.type === 'AMOUNT' ? '₺' : '🎁';
            return `
            <div class="card flex justify-between items-center gap-4" style="${!available ? 'opacity:0.7;' : ''}">
              <div class="flex items-start gap-3 min-w-0">
                <div style="width:40px;height:40px;border-radius:var(--r-md);background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0;">${typeIcon}</div>
                <div class="min-w-0">
                  <div class="font-semibold" style="color:var(--navy);font-size:0.925rem;">${r.name}</div>
                  ${r.partnerName ? `<div class="text-xs" style="color:var(--text-subtle);margin-top:0.15rem;">${r.partnerName}</div>` : ''}
                  <div style="margin-top:0.4rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                    <span class="chip info"><i data-feather="zap" style="width:10px;height:10px;"></i> ${r.costPoints} pts</span>
                    ${!inStock ? '<span class="badge badge-full">Out of stock</span>' : ''}
                    ${inStock && !canAfford ? '<span class="badge badge-pending">Need more pts</span>' : ''}
                  </div>
                </div>
              </div>
              <button
                class="btn ${available ? 'primary' : 'disabled'} btn-sm redeem-btn flex-shrink-0"
                data-id="${r.id}"
                ${!available ? 'disabled' : ''}
                title="${!canAfford ? 'Not enough points' : !inStock ? 'Out of stock' : 'Claim this reward'}">
                <i data-feather="gift" style="width:13px;height:13px;"></i>
                Redeem
              </button>
            </div>`;
        }).join('') || createEmptyState("gift", "No rewards available", "We are currently adding new rewards.");

        // My vouchers
        document.getElementById('voucherList').innerHTML = vouchers.map(v => `
            <div class="voucher-card ${v.status === 'REDEEMED' ? 'opacity-60' : ''}">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-semibold" style="color:var(--navy);font-size:0.925rem;">${v.rewardName || 'Reward'}</div>
                  ${v.partnerName ? `<div class="text-xs" style="color:var(--text-subtle);margin-top:0.1rem;">${v.partnerName}</div>` : ''}
                </div>
                <span class="badge ${v.status === 'REDEEMED' ? 'badge-redeemed' : 'badge-active'}">${v.status}</span>
              </div>
              <div class="voucher-code">${v.code}</div>
              <div class="flex justify-between items-center text-xs" style="color:var(--text-subtle);">
                <span><i data-feather="copy" style="width:11px;height:11px;display:inline;vertical-align:middle;margin-right:3px;"></i>Show to partner</span>
                ${v.expiresAt ? `<span><i data-feather="clock" style="width:11px;height:11px;display:inline;vertical-align:middle;margin-right:3px;"></i>Expires ${new Date(v.expiresAt).toLocaleDateString()}</span>` : ''}
              </div>
            </div>`).join('')
          || createEmptyState("tag", "No active vouchers", "You haven't redeemed any rewards yet.");

    } else {
        // Non-student view — read-only catalogue
        document.getElementById('wallet').innerHTML =
            `<div class="card" style="padding:1.25rem;display:flex;align-items:center;gap:0.75rem;">
               <i data-feather="info" style="width:16px;height:16px;color:var(--text-subtle);flex-shrink:0;"></i>
               <span style="font-size:0.875rem;color:var(--text-muted);">CampusCoin wallets are only available for students.</span>
             </div>`;

        document.getElementById('rewardsList').innerHTML = rewards.map(r => {
            const typeIcon = r.type === 'PERCENT' ? '%' : r.type === 'AMOUNT' ? '₺' : '🎁';
            return `
            <div class="card flex justify-between items-center gap-4">
              <div class="flex items-start gap-3 min-w-0">
                <div style="width:38px;height:38px;border-radius:var(--r-md);background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${typeIcon}</div>
                <div class="min-w-0">
                  <div class="font-semibold" style="color:var(--navy);font-size:0.9rem;">${r.name}</div>
                  ${r.partnerName ? `<div class="text-xs" style="color:var(--text-subtle);">${r.partnerName}</div>` : ''}
                  <div style="margin-top:0.35rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
                    <span class="chip info">${r.costPoints} pts</span>
                    <span class="chip">Stock: ${r.stock ?? '∞'}</span>
                  </div>
                </div>
              </div>
            </div>`;
        }).join('')
          || createEmptyState("gift", "No rewards available", "We are currently adding new rewards.");

        document.getElementById('voucherList').innerHTML =
            '<div class="text-sm text-gray-500 italic">Vouchers are only available for students.</div>';
    }

    if (typeof feather !== 'undefined') feather.replace();
}
