import { renderNavbar, showSuccess, showError, formatDateShort } from './utils.js';
import { getFavorites, removeFavorite, getInquiries, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, updateProfile as apiUpdateProfile } from './api.js';
import { getCurrentUser, requireRole, clearTokens } from './auth.js';

const API_URL = 'http://localhost:8000/api';

let allFavorites     = [];
let allInquiries     = [];
let allNotifications = [];
let allSearches      = [];

const PLACEHOLDER = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="75"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="11">No Photo</text></svg>';

// ==================== INIT ====================

async function init() {
    const user = getCurrentUser();
    if (!user) { window.location.href = 'login.html'; return; }
    if (user.role === 'landlord') { window.location.href = 'dashboard-landlord.html'; return; }
    if (user.role === 'admin')    { window.location.href = 'dashboard-admin.html'; return; }

    renderNavbar(user);

    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    document.getElementById('welcome-heading').textContent = `Welcome back, ${user.first_name || 'there'}!`;
    document.getElementById('user-name').textContent  = name;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-avatar').textContent = user.first_name?.[0]?.toUpperCase() || '🎓';

    loadProfile(user);
    await Promise.all([loadFavorites(), loadInquiries(), loadNotifications(), loadSavedSearches()]);
    updateOverview();
}

// ==================== SECTION SWITCHING ====================

window.switchSection = (section) => {
    document.querySelectorAll('.dash-section').forEach(el => el.classList.remove('active'));
    document.getElementById(section)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${section}`)?.classList.add('active');
};

// ==================== FAVORITES ====================

async function loadFavorites() {
    try {
        allFavorites = await getFavorites();
        const count  = Array.isArray(allFavorites) ? allFavorites.length : 0;

        document.getElementById('qs-saved').textContent = count;
        const badge = document.getElementById('badge-saved');
        badge.textContent = count;
        badge.classList.toggle('show', count > 0);

        renderFavorites();
        renderOverviewFavorites();
    } catch (err) {
        console.error('Error loading favorites:', err);
    }
}

function buildFavItem(fav) {
    const prop    = fav.property || fav;
    const img     = prop.images?.[0]?.image || PLACEHOLDER;
    const rent    = parseInt(prop.rent_amount || 0).toLocaleString();
    const area    = prop.location_area_name || prop.estate || prop.town_name || 'Kilifi';
    const propId  = prop.id || fav.property_id;

    return `
        <div class="saved-item">
            <img src="${img}" class="saved-img" onerror="this.src='${PLACEHOLDER}'" alt="${prop.title}">
            <div>
                <div class="saved-title">${prop.title}</div>
                <div class="saved-meta">📍 ${area}</div>
                <div class="saved-rent">KES ${rent}/mo</div>
            </div>
            <div class="saved-actions">
                <a href="property.html?id=${propId}" class="btn btn-sm btn-primary">View</a>
                <button class="btn btn-sm btn-secondary" onclick="doRemoveFavorite(${propId})">Remove</button>
            </div>
        </div>`;
}

function renderFavorites() {
    const container = document.getElementById('saved-container');
    if (!allFavorites.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❤️</div>
                <h3>No saved properties yet</h3>
                <p>Browse listings and tap the heart icon to save properties you like.</p>
                <a href="search.html" class="btn btn-primary">Browse Properties</a>
            </div>`;
        return;
    }
    container.innerHTML = allFavorites.map(buildFavItem).join('');
}

function renderOverviewFavorites() {
    const container = document.getElementById('overview-saved');
    const recent    = allFavorites.slice(0, 3);
    if (!recent.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❤️</div>
                <h3>No saved properties</h3>
                <p>Browse and save properties you like.</p>
                <a href="search.html" class="btn btn-primary">Browse Properties</a>
            </div>`;
        return;
    }
    container.innerHTML = recent.map(buildFavItem).join('');
}

// ==================== INQUIRIES ====================

async function loadInquiries() {
    try {
        allInquiries = await getInquiries();
        const count  = allInquiries.length;

        document.getElementById('qs-inquiries').textContent = count;
        const badge = document.getElementById('badge-inquiries');
        badge.textContent = count;
        badge.classList.toggle('show', count > 0);

        renderInquiries();
        renderOverviewInquiries();
    } catch (err) {
        console.error('Error loading inquiries:', err);
    }
}

function buildInquiryItem(inq) {
    const prop   = inq.property || {};
    const img    = prop.images?.[0]?.image || PLACEHOLDER;
    const dated  = formatDateShort ? formatDateShort(inq.created_at) : inq.created_at?.split('T')[0];
    const propId = prop.id || inq.property_id;
    const phone  = prop.whatsapp_number || prop.landlord?.phone_number || '';
    const digits = phone.replace(/\D/g, '');

    return `
        <div class="inquiry-item">
            <div class="inq-header">
                <div class="inq-prop">🏠 ${prop.title || 'Property'}</div>
                <div class="inq-date">${dated}</div>
            </div>
            <div class="inq-msg">${inq.message}</div>
            <div style="display:flex;gap:var(--spacing-sm);align-items:center;flex-wrap:wrap;">
                ${digits ? `<a href="https://wa.me/${digits}" target="_blank" class="btn btn-sm btn-primary">📱 WhatsApp Landlord</a>` : ''}
                ${propId ? `<a href="property.html?id=${propId}" class="btn btn-sm btn-secondary">View Listing</a>` : ''}
                <span class="status-badge status-${inq.status||'pending'}">${inq.status||'pending'}</span>
            </div>
        </div>`;
}

function renderInquiries() {
    const container = document.getElementById('inquiries-container');
    if (!allInquiries.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💬</div>
                <h3>No inquiries yet</h3>
                <p>When you contact a landlord from a listing, it will appear here.</p>
                <a href="search.html" class="btn btn-primary">Browse Properties</a>
            </div>`;
        return;
    }
    container.innerHTML = allInquiries.map(buildInquiryItem).join('');
}

function renderOverviewInquiries() {
    const container = document.getElementById('overview-inquiries');
    const recent    = allInquiries.slice(0, 2);
    if (!recent.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><h3>No inquiries yet</h3></div>`;
        return;
    }
    container.innerHTML = recent.map(buildInquiryItem).join('');
}

// ==================== NOTIFICATIONS ====================

async function loadNotifications() {
    try {
        const data   = await getNotifications();
        allNotifications = Array.isArray(data) ? data : data.results || [];
        const unread = allNotifications.filter(n => !n.is_read).length;

        document.getElementById('qs-notifs').textContent = unread;
        const badge = document.getElementById('badge-notifs');
        badge.textContent = unread;
        badge.classList.toggle('show', unread > 0);

        renderNotifications();
    } catch (err) {
        console.error('Error loading notifications:', err);
    }
}

function renderNotifications() {
    const container = document.getElementById('notifications-container');
    if (!allNotifications.length) {
        container.innerHTML = `
            <div class="empty-state" style="padding:var(--spacing-2xl);">
                <div class="empty-icon">🔔</div>
                <h3>No notifications</h3>
                <p>You're all caught up!</p>
            </div>`;
        return;
    }

    container.innerHTML = allNotifications.map(n => {
        const dated = formatDateShort ? formatDateShort(n.created_at) : n.created_at?.split('T')[0];
        return `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="readNotif(${n.id}, this)">
                <div class="notif-icon">🔔</div>
                <div class="notif-text">
                    <div>${n.message}</div>
                    <div class="notif-date">${dated}</div>
                </div>
                ${!n.is_read ? '<div class="notif-dot"></div>' : ''}
            </div>`;
    }).join('');
}

window.readNotif = async (id, el) => {
    try {
        await markNotificationAsRead(id);
        el.classList.remove('unread');
        const dot = el.querySelector('.notif-dot');
        if (dot) dot.remove();
        await loadNotifications();
    } catch (err) {
        console.error('Error marking notification:', err);
    }
};

window.markAllRead = async () => {
    try {
        await markAllNotificationsAsRead();
        await loadNotifications();
        showSuccess('All notifications marked as read');
    } catch {
        showError('Failed to mark notifications');
    }
};

// ==================== SAVED SEARCHES ====================

async function loadSavedSearches() {
    try {
        const token = localStorage.getItem('access_token');
        const res   = await fetch(`${API_URL}/properties/saved-searches/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data   = await res.json();
        allSearches  = data.results || data;
        renderSavedSearches();
    } catch (err) {
        console.error('Error loading saved searches:', err);
    }
}

function renderSavedSearches() {
    const container = document.getElementById('searches-container');
    if (!allSearches.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No saved searches</h3>
                <p>Save your search criteria to quickly find matching properties.</p>
                <a href="search.html" class="btn btn-primary">Search Properties</a>
            </div>`;
        return;
    }
    container.innerHTML = allSearches.map(s => {
        const criteria = Object.entries(s.filters || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'Custom search';
        return `
            <div class="search-item">
                <div>
                    <div class="search-name">${s.name || 'Saved Search'}</div>
                    <div class="search-criteria">${criteria}</div>
                </div>
                <div class="search-actions">
                    <a href="search.html?saved=${s.id}" class="btn btn-sm btn-primary">Run Search</a>
                    <button class="btn btn-sm btn-secondary" onclick="deleteSearch(${s.id})">Delete</button>
                </div>
            </div>`;
    }).join('');
}

window.deleteSearch = async (id) => {
    if (!confirm('Delete this saved search?')) return;
    try {
        const token = localStorage.getItem('access_token');
        await fetch(`${API_URL}/properties/saved-searches/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        await loadSavedSearches();
    } catch { showError('Failed to delete search'); }
};

// ==================== OVERVIEW ====================

function updateOverview() {
    renderOverviewFavorites();
    renderOverviewInquiries();
}

// ==================== PROFILE ====================

function loadProfile(user) {
    document.getElementById('p-first-name').value = user.first_name || '';
    document.getElementById('p-last-name').value  = user.last_name  || '';
    document.getElementById('p-email').value       = user.email      || '';
    document.getElementById('p-phone').value       = user.phone_number || '';
}

window.saveProfile = async () => {
    const data = {
        first_name:   document.getElementById('p-first-name').value.trim(),
        last_name:    document.getElementById('p-last-name').value.trim(),
        phone_number: document.getElementById('p-phone').value.trim(),
    };
    try {
        await apiUpdateProfile(data);
        const user = getCurrentUser();
        Object.assign(user, data);
        localStorage.setItem('user', JSON.stringify(user));
        document.getElementById('user-name').textContent = `${data.first_name} ${data.last_name}`.trim();
        showSuccess('Profile updated');
    } catch { showError('Failed to update profile'); }
};

window.changePassword = async () => {
    const current  = document.getElementById('p-current-pwd').value;
    const newPwd   = document.getElementById('p-new-pwd').value;
    const confirm  = document.getElementById('p-confirm-pwd').value;

    if (!current || !newPwd || !confirm) { showError('Fill all password fields'); return; }
    if (newPwd !== confirm) { showError('Passwords do not match'); return; }
    if (newPwd.length < 6) { showError('New password must be at least 6 characters'); return; }

    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/auth/change-password/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ old_password: current, new_password: newPwd }),
        });
        if (!res.ok) throw new Error();
        showSuccess('Password changed successfully');
        document.getElementById('p-current-pwd').value = '';
        document.getElementById('p-new-pwd').value     = '';
        document.getElementById('p-confirm-pwd').value = '';
    } catch { showError('Failed to change password'); }
};

window.confirmDeleteAccount = async () => {
    if (!confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) return;
    if (!confirm('This will delete ALL your data. Are you absolutely sure?')) return;
    try {
        const user  = getCurrentUser();
        const token = localStorage.getItem('access_token');
        await fetch(`${API_URL}/auth/users/${user.id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        clearTokens();
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    } catch { showError('Failed to delete account'); }
};

// ==================== ACTIONS ====================

window.doRemoveFavorite = async (propId) => {
    if (!confirm('Remove from saved?')) return;
    try {
        await removeFavorite(propId);
        showSuccess('Removed from saved');
        await loadFavorites();
    } catch { showError('Failed to remove'); }
};

window.logoutUser = () => {
    clearTokens();
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};

document.addEventListener('DOMContentLoaded', init);
