import { renderNavbar, getLocalStorage } from './utils.js';
import { getCurrentUser, setCurrentUser, handleLogout } from './auth.js';

const API = `${window.location.protocol}//${window.location.host}/api`;

let userData = null;

// ── Init ─────────────────────────────────────────────────
async function init() {
    const stored = getCurrentUser();

    // Not logged in → send to login
    if (!stored) {
        window.location.href = 'login.html';
        return;
    }

    renderNavbar(stored);

    try {
        const token = getLocalStorage('access_token');
        const res = await fetch(`${API}/auth/me/`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        userData = await res.json();
        setCurrentUser(userData);
        renderNavbar(userData);
        populatePage();
    } catch (err) {
        console.error('profile init:', err);
        showAlert('pf-basic-alert', 'error', 'Could not load profile. Check your connection.');
    }
}

// ── Populate all sections ────────────────────────────────
function populatePage() {
    const u = userData;
    const fullName = `${u.first_name} ${u.last_name}`.trim() || u.username;
    const initials = ((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase() || u.username[0].toUpperCase();
    const joined   = new Date(u.created_at).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

    // Hero
    document.getElementById('pf-avatar-initials').textContent = initials;
    document.getElementById('pf-full-name').textContent       = fullName;
    document.getElementById('pf-username-display').textContent = `@${u.username}`;
    document.getElementById('pf-joined').textContent          = `Member since ${joined}`;

    const roleBadge = document.getElementById('pf-role-badge');
    roleBadge.textContent = u.role.charAt(0).toUpperCase() + u.role.slice(1);
    roleBadge.className = `pf-role-badge ${u.role}`;

    // Basic form
    document.getElementById('pf-first-name').value = u.first_name || '';
    document.getElementById('pf-last-name').value  = u.last_name  || '';
    document.getElementById('pf-email').value      = u.email      || '';
    document.getElementById('pf-phone').value      = u.phone_number || '';
    document.getElementById('pf-username').value   = u.username   || '';

    // Dashboard link
    const dashMap = { admin: 'dashboard-admin.html', landlord: 'dashboard-landlord.html', tenant: 'dashboard-tenant.html' };
    document.getElementById('pf-dashboard-link').href = dashMap[u.role] || 'index.html';

    // Role-specific
    if (u.role === 'landlord') {
        renderLandlordSection(u.landlord_profile);
    } else if (u.role === 'tenant') {
        renderTenantSection(u.tenant_profile);
    }
}

// ── Landlord profile section ─────────────────────────────
function renderLandlordSection(profile) {
    if (!profile) return;

    // Verification badge
    const badge = document.getElementById('pf-verify-badge');
    if (profile.is_verified) {
        badge.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Verified Landlord`;
        badge.className = 'pf-verify-badge verified';
    } else {
        badge.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Pending Verification`;
        badge.className = 'pf-verify-badge unverified';
    }
    badge.style.display = 'inline-flex';

    // Role card
    document.getElementById('pf-role-card-title').textContent = 'Landlord Details';
    document.getElementById('pf-role-body').innerHTML = `
        <div id="pf-role-alert" class="pf-alert"></div>
        <div class="pf-grid">
            <div class="pf-field">
                <label>National ID</label>
                <input type="text" id="pf-national-id" value="${profile.national_id || ''}" placeholder="e.g. 12345678">
            </div>
            <div class="pf-field">
                <label>WhatsApp Number</label>
                <input type="tel" id="pf-whatsapp" value="${profile.whatsapp_number || ''}" placeholder="+254 7XX XXX XXX">
            </div>
            <div class="pf-field pf-grid-full">
                <label>Bio / Building Description</label>
                <textarea id="pf-bio" rows="3" placeholder="Tell tenants about your property or yourself…">${profile.bio || ''}</textarea>
            </div>
        </div>
        <div class="pf-btn-row">
            <button class="pf-save" onclick="saveLandlordProfile()">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                Save Details
            </button>
        </div>
    `;
    document.getElementById('pf-role-card').style.display = '';

    // Stats
    document.getElementById('pf-stats-grid').innerHTML = `
        <div class="pf-stat"><div class="pf-stat-val">${profile.total_listings ?? 0}</div><div class="pf-stat-lbl">Listings</div></div>
        <div class="pf-stat"><div class="pf-stat-val">${parseFloat(profile.average_rating || 0).toFixed(1)}</div><div class="pf-stat-lbl">Avg. Rating</div></div>
        <div class="pf-stat"><div class="pf-stat-val">${profile.total_views ?? 0}</div><div class="pf-stat-lbl">Total Views</div></div>
        <div class="pf-stat"><div class="pf-stat-val">${profile.total_inquiries ?? 0}</div><div class="pf-stat-lbl">Inquiries</div></div>
    `;
    document.getElementById('pf-stats-card').style.display = '';
}

// ── Tenant profile section ────────────────────────────────
function renderTenantSection(profile) {
    if (!profile) return;

    document.getElementById('pf-role-card-title').textContent = 'Accommodation Preferences';
    document.getElementById('pf-role-body').innerHTML = `
        <div id="pf-role-alert" class="pf-alert"></div>
        <div class="pf-grid">
            <div class="pf-field">
                <label>Budget Min (KES / month)</label>
                <input type="number" id="pf-budget-min" value="${profile.budget_min || ''}" placeholder="e.g. 3000" min="0">
            </div>
            <div class="pf-field">
                <label>Budget Max (KES / month)</label>
                <input type="number" id="pf-budget-max" value="${profile.budget_max || ''}" placeholder="e.g. 8000" min="0">
            </div>
            <div class="pf-field pf-grid-full">
                <label>Max Distance from Kilifi Town (km)</label>
                <input type="number" id="pf-max-dist" value="${profile.max_distance_km || 5}" placeholder="5" min="0" max="20" step="0.5">
            </div>
        </div>
        <div class="pf-btn-row">
            <button class="pf-save" onclick="saveTenantProfile()">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                Save Preferences
            </button>
        </div>
    `;
    document.getElementById('pf-role-card').style.display = '';
}

// ── Save basic info ──────────────────────────────────────
async function saveBasicInfo() {
    const btn = document.getElementById('pf-save-basic');
    btn.disabled = true;
    btn.querySelector('svg').style.display = 'none';
    btn.childNodes[btn.childNodes.length - 1].textContent = ' Saving…';

    const body = {
        first_name:   document.getElementById('pf-first-name').value.trim(),
        last_name:    document.getElementById('pf-last-name').value.trim(),
        phone_number: document.getElementById('pf-phone').value.trim(),
    };

    try {
        const token = getLocalStorage('access_token');
        const res = await fetch(`${API}/auth/me/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        });

        if (!res.ok) throw await res.json();
        const updated = await res.json();

        // Merge updated user fields
        userData = { ...userData, ...updated };
        setCurrentUser(userData);

        // Refresh hero
        const fullName = `${userData.first_name} ${userData.last_name}`.trim() || userData.username;
        const initials = ((userData.first_name?.[0] || '') + (userData.last_name?.[0] || '')).toUpperCase() || userData.username[0].toUpperCase();
        document.getElementById('pf-full-name').textContent       = fullName;
        document.getElementById('pf-avatar-initials').textContent = initials;

        showAlert('pf-basic-alert', 'success', 'Profile updated successfully.');
    } catch (err) {
        const msg = err?.detail || err?.non_field_errors?.[0] || 'Could not save changes.';
        showAlert('pf-basic-alert', 'error', msg);
    } finally {
        btn.disabled = false;
        btn.querySelector('svg').style.display = '';
        btn.childNodes[btn.childNodes.length - 1].textContent = ' Save Changes';
    }
}
window.saveBasicInfo = saveBasicInfo;

// ── Save landlord profile ─────────────────────────────────
async function saveLandlordProfile() {
    const body = {
        national_id:    document.getElementById('pf-national-id')?.value?.trim() || null,
        whatsapp_number: document.getElementById('pf-whatsapp')?.value?.trim() || '',
        bio:            document.getElementById('pf-bio')?.value?.trim() || '',
    };

    await saveProfile(body, 'pf-role-alert');
}
window.saveLandlordProfile = saveLandlordProfile;

// ── Save tenant profile ───────────────────────────────────
async function saveTenantProfile() {
    const body = {
        budget_min:       document.getElementById('pf-budget-min')?.value || 0,
        budget_max:       document.getElementById('pf-budget-max')?.value || 0,
        max_distance_km:  document.getElementById('pf-max-dist')?.value   || 5,
    };

    await saveProfile(body, 'pf-role-alert');
}
window.saveTenantProfile = saveTenantProfile;

async function saveProfile(body, alertId) {
    try {
        const token = getLocalStorage('access_token');
        const res = await fetch(`${API}/auth/profile/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        });

        if (!res.ok) throw await res.json();
        showAlert(alertId, 'success', 'Details saved successfully.');
    } catch (err) {
        const msg = err?.detail || err?.non_field_errors?.[0] || Object.values(err || {})[0]?.[0] || 'Could not save.';
        showAlert(alertId, 'error', msg);
    }
}

// ── Logout ────────────────────────────────────────────────
function doLogout() {
    handleLogout();
}
window.doLogout = doLogout;

// ── Alert helper ──────────────────────────────────────────
function showAlert(id, type, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    const icon = type === 'success'
        ? `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`
        : `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    el.innerHTML = icon + msg;
    el.className = `pf-alert show ${type}`;
    setTimeout(() => el.classList.remove('show'), 4000);
}

document.addEventListener('DOMContentLoaded', init);
