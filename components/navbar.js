// ============================================================
// NAVBAR Web Component
// White bar, thin bottom border, serif navy logo, underlined
// active tab. Role badge is small and subtle.
// Shadow DOM is NOT used so global styles apply.
// ============================================================

class CustomNavbar extends HTMLElement {
  connectedCallback() {
    const user = JSON.parse(localStorage.getItem('sacs_user') || 'null');

    this.innerHTML = `
      <nav id="nav" class="sacs-nav ${user ? '' : 'hidden'}">
        <a href="#" class="logo" id="navLogo">
          <div class="logo-mark">S</div>
          <span class="logo-text">SACS</span>
        </a>

        <div id="tabs" class="nav-links"></div>

        <div class="user-info">
          <span id="userName" class="user-name">${user?.name ? escapeHtml(user.name) : ''}</span>
          <span id="roleBadge" class="role-badge" data-role="${user?.role || ''}">${user?.role || ''}</span>
          <button id="logoutBtn" class="btn ghost btn-sm" style="font-size:0.8rem;padding:0.3rem 0.75rem;">
            <i data-feather="log-out" style="width:14px;height:14px;"></i>
            Logout
          </button>
        </div>
      </nav>
    `;

    this.querySelector('#logoutBtn')?.addEventListener('click', () => {
      if (typeof logout === 'function') {
        logout();
      } else {
        localStorage.removeItem('sacs_user');
        window.location.reload();
      }
    });

    if (typeof initTabs === 'function') initTabs();
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

customElements.define('custom-navbar', CustomNavbar);
