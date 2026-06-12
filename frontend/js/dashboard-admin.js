import { renderNavbar, showSuccess, showError, formatDateShort } from './utils.js';
import {
    getPendingProperties, approveProperty, rejectProperty,
    getUsers, getProperties, verifyLandlord, verifyProperty
} from './api.js';
import { getCurrentUser, requireRole, clearTokens } from './auth.js';

const API_BASE = `${window.location.protocol}//${window.location.host}/api`;

let allUsers         = [];
let pendingProps     = [];
let allProps         = [];
let currentRejectId  = null;
let currentRejectLandlordId = null;

const PLACEHOLDER = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="12">No Photo</text></svg>';

async function init() {
    requireRole('admin');
    const user = getCurrentUser();
    renderNavbar(user);

    await Promise.all([loadUsers(), loadPendingProperties(), loadAllProperties()]);
    renderOverviewQueues();
    renderAnalytics();
    loadRevenue();
}

// ==================== USERS ====================

async function loadUsers() {
    try {
        allUsers = await getUsers();

        const total      = allUsers.length;
        const landlords  = allUsers.filter(u => u.role === 'landlord');
        const unverified = landlords.filter(u => !u.landlord_profile?.is_verified).length;
        const verified   = landlords.filter(u =>  u.landlord_profile?.is_verified).length;

        document.getElementById('stat-users').textContent      = total;
        document.getElementById('stat-unverified').textContent = unverified;
        document.getElementById('stat-verified').textContent   = verified;

        const badge = document.getElementById('badge-landlords');
        badge.textContent = unverified;
        badge.classList.toggle('show', unverified > 0);

        renderLandlordQueue();
        renderUsersTable(allUsers);
    } catch (err) {
        console.error('Error loading users:', err);
    }
}

function renderLandlordQueue() {
    const landlords = allUsers.filter(u => u.role === 'landlord');
    const container = document.getElementById('landlord-queue-container');

    if (!landlords.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👤</div>
                <h3>No landlords registered yet</h3>
                <p>Landlords will appear here once they register.</p>
            </div>`;
        return;
    }

    const pending  = landlords.filter(u => !u.landlord_profile?.is_verified);
    const verified = landlords.filter(u =>  u.landlord_profile?.is_verified);

    let html = '';
    if (pending.length) {
        html += `<h3 style="color:#92400E;margin-bottom:12px;">⏳ Pending Verification (${pending.length})</h3>`;
        html += pending.map(u => buildLandlordCard(u)).join('');
    }
    if (verified.length) {
        html += `<h3 style="color:#065F46;margin:24px 0 12px;">✅ Verified Landlords (${verified.length})</h3>`;
        html += verified.map(u => buildLandlordCard(u)).join('');
    }

    container.innerHTML = html;
}

function buildLandlordCard(u) {
    const profile  = u.landlord_profile || {};
    const name     = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
    const rawDate  = u.date_joined || u.created_at;
    const joined   = formatDateShort ? formatDateShort(rawDate) : (rawDate?.split('T')[0] || '—');
    const phone    = u.phone_number || '—';
    const waNumber = profile.whatsapp_number || phone;
    const waDigits = waNumber.replace(/\D/g, '');

    return `
        <div class="queue-card">
            <div class="queue-card-inner">
                <div style="background:#F3F4F6;display:flex;align-items:center;justify-content:center;width:160px;min-height:140px;">
                    <span style="font-size:3rem;">👤</span>
                </div>
                <div class="queue-info">
                    <div class="queue-title">${name}</div>
                    <div class="queue-sub">@${u.username} · ${u.email}</div>
                    <div class="queue-meta">
                        <span>📞 ${phone}</span>
                        ${profile.national_id ? `<span>🪪 ID: ${profile.national_id}</span>` : ''}
                        <span>📅 Joined ${joined}</span>
                    </div>
                    ${profile.bio ? `<p style="font-size:var(--font-size-sm);color:var(--color-text);margin-top:8px;">${profile.bio}</p>` : ''}
                </div>
                <div class="queue-actions">
                    ${profile.is_verified
                        ? `<span class="role-badge verify-badge" style="text-align:center;padding:6px 12px;">✅ Verified</span>`
                        : `<span class="role-badge pending-badge" style="text-align:center;padding:6px 12px;">⏳ Pending</span>`
                    }
                    ${waDigits ? `<a href="https://wa.me/${waDigits}" target="_blank" class="btn btn-sm btn-secondary">📱 WhatsApp</a>` : ''}
                    <a href="tel:${phone}" class="btn btn-sm btn-secondary">📞 Call</a>
                    ${profile.is_verified
                        ? `<button class="btn btn-sm btn-danger" onclick="doRevokeLandlord(${u.id})">✕ Revoke</button>`
                        : `<button class="btn btn-sm btn-primary" onclick="doVerifyLandlord(${u.id})">✅ Verify</button>
                           <button class="btn btn-sm btn-danger" onclick="openRejectLandlordModal(${u.id})">✕ Reject</button>`
                    }
                </div>
            </div>
        </div>`;
}

function renderOverviewLandlords() {
    const unverified = allUsers.filter(u => u.role === 'landlord' && !u.landlord_profile?.is_verified).slice(0, 3);
    const container  = document.getElementById('overview-landlords');

    if (!unverified.length) {
        container.innerHTML = `<p style="color:var(--color-text-muted);text-align:center;padding:8px;">No pending landlords ✅</p>`;
        return;
    }

    container.innerHTML = unverified.map(u => {
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--color-border);">
            <span style="font-size:var(--font-size-sm);">👤 ${name}</span>
            <button class="btn btn-sm btn-primary" onclick="doVerifyLandlord(${u.id})">Verify</button>
        </div>`;
    }).join('');
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-tbody');
    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:30px;">No users found</td></tr>`;
        return;
    }
    tbody.innerHTML = users.map(u => {
        const name    = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
        const rawJoined = u.date_joined || u.created_at;
        const joined    = formatDateShort ? formatDateShort(rawJoined) : (rawJoined?.split('T')[0] || '—');
        const roleClass = `role-${u.role}`;
        const isLandlordVerified = u.role === 'landlord' ? (u.landlord_profile?.is_verified ? '<span class="role-badge verify-badge">Verified</span>' : '<span class="role-badge pending-badge">Pending</span>') : '—';

        return `<tr>
            <td><strong>${name}</strong></td>
            <td>${u.email}</td>
            <td>${u.phone_number || '—'}</td>
            <td><span class="role-badge ${roleClass}">${u.role}</span></td>
            <td>${joined}</td>
            <td>${isLandlordVerified}</td>
            <td><a href="mailto:${u.email}" class="btn btn-sm btn-secondary">Contact</a></td>
        </tr>`;
    }).join('');
}

// ==================== PROPERTIES ====================

async function loadPendingProperties() {
    try {
        pendingProps = await getPendingProperties();
        document.getElementById('stat-pending').textContent = pendingProps.length;

        const badge = document.getElementById('badge-properties');
        badge.textContent = pendingProps.length;
        badge.classList.toggle('show', pendingProps.length > 0);

        renderPropertyQueue();
    } catch (err) {
        console.error('Error loading pending properties:', err);
    }
}

async function loadAllProperties() {
    try {
        const data = await getProperties({ limit: 200 });
        allProps   = data.results || data;
        document.getElementById('stat-properties').textContent = Array.isArray(allProps) ? allProps.length : '—';
    } catch (err) {
        console.error('Error loading all properties:', err);
    }
}

function renderPropertyQueue() {
    const container = document.getElementById('property-queue-container');

    if (!pendingProps.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <h3>No pending approvals</h3>
                <p>All submitted properties have been reviewed.</p>
            </div>`;
        return;
    }

    container.innerHTML = pendingProps.map(p => buildPropertyQueueCard(p)).join('');
}

function buildPropertyQueueCard(p) {
    const img      = p.images?.[0]?.image || PLACEHOLDER;
    const landlord = p.landlord_name || p.landlord?.first_name || 'Unknown Landlord';
    const area     = p.location_area_name || p.estate || p.town_name || 'Kilifi';
    const rent     = parseInt(p.rent_amount).toLocaleString();
    const dated    = formatDateShort ? formatDateShort(p.created_at) : p.created_at?.split('T')[0];

    return `
        <div class="queue-card">
            <div class="queue-card-inner">
                <img src="${img}" class="queue-img" onerror="this.src='${PLACEHOLDER}'" alt="${p.title}">
                <div class="queue-info">
                    <div class="queue-title">${p.title}</div>
                    <div class="queue-sub">By: ${landlord}</div>
                    <div class="queue-meta">
                        <span>📍 ${area}</span>
                        <span>💰 KES ${rent}/mo</span>
                        <span>🏠 ${p.property_type?.replace('_', ' ')}</span>
                        <span>📅 ${dated}</span>
                    </div>
                    ${p.description ? `<p style="font-size:var(--font-size-sm);color:var(--color-text);margin-top:8px;line-height:1.5;">${p.description.slice(0, 200)}${p.description.length > 200 ? '...' : ''}</p>` : ''}
                </div>
                <div class="queue-actions">
                    <a href="property.html?id=${p.id}" target="_blank" class="btn btn-sm btn-secondary">Preview</a>
                    <button class="btn btn-sm btn-primary" onclick="doApproveProperty(${p.id})">✅ Approve</button>
                    <button class="btn btn-sm btn-danger" onclick="openRejectionModal(${p.id})">✕ Reject</button>
                </div>
            </div>
        </div>`;
}

function renderOverviewProperties() {
    const container = document.getElementById('overview-properties');
    const recent    = pendingProps.slice(0, 3);

    if (!recent.length) {
        container.innerHTML = `<p style="color:var(--color-text-muted);text-align:center;padding:8px;">No pending properties ✅</p>`;
        return;
    }

    container.innerHTML = recent.map(p => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--color-border);">
            <span style="font-size:var(--font-size-sm);">🏠 ${p.title.slice(0,35)}${p.title.length>35?'...':''}</span>
            <button class="btn btn-sm btn-primary" onclick="doApproveProperty(${p.id})">Approve</button>
        </div>`).join('');
}

function renderOverviewQueues() {
    renderOverviewLandlords();
    renderOverviewProperties();
}

// ==================== ANALYTICS ====================

function renderAnalytics() {
    // Most viewed
    const byViews = [...allProps].sort((a,b) => (b.views_count||0)-(a.views_count||0)).slice(0,5);
    document.getElementById('top-properties-views').innerHTML = byViews.length
        ? byViews.map(p => `<div class="perf-row"><span>${p.title.slice(0,35)}</span><span style="font-weight:700;">${p.views_count||0} views</span></div>`).join('')
        : '<p style="text-align:center;color:var(--color-text-muted);">No data</p>';

    // Most active landlords (by listing count)
    const landlordMap = {};
    allProps.forEach(p => {
        const k = p.landlord_name || p.landlord?.first_name || 'Unknown';
        landlordMap[k] = (landlordMap[k] || 0) + 1;
    });
    const topLandlords = Object.entries(landlordMap).sort((a,b) => b[1]-a[1]).slice(0,5);
    document.getElementById('top-landlords').innerHTML = topLandlords.length
        ? topLandlords.map(([name, count]) => `<div class="perf-row"><span>${name}</span><span style="font-weight:700;">${count} listings</span></div>`).join('')
        : '<p style="text-align:center;color:var(--color-text-muted);">No data</p>';

    // Popular areas
    const areaMap = {};
    allProps.forEach(p => {
        const k = p.location_area_name || p.estate || 'Unknown';
        areaMap[k] = (areaMap[k] || 0) + 1;
    });
    const topAreas = Object.entries(areaMap).sort((a,b) => b[1]-a[1]).slice(0,5);
    document.getElementById('popular-areas').innerHTML = topAreas.length
        ? topAreas.map(([area, count]) => `<div class="perf-row"><span>${area}</span><span style="font-weight:700;">${count} listings</span></div>`).join('')
        : '<p style="text-align:center;color:var(--color-text-muted);">No data</p>';

    // Property type breakdown
    const typeMap = {};
    allProps.forEach(p => { typeMap[p.property_type||'other'] = (typeMap[p.property_type||'other'] || 0) + 1; });
    const types = Object.entries(typeMap).sort((a,b) => b[1]-a[1]);
    const typeLabels = { single_room: 'Single Room', bedsitter: 'Bedsitter', studio: 'Studio', '1br': '1 Bedroom', '2br': '2 Bedroom', '3br': '3 Bedroom', maisonette: 'Maisonette', commercial: 'Commercial' };
    document.getElementById('property-types').innerHTML = types.length
        ? types.map(([type, count]) => `<div class="perf-row"><span>${typeLabels[type]||type}</span><span style="font-weight:700;">${count}</span></div>`).join('')
        : '<p style="text-align:center;color:var(--color-text-muted);">No data</p>';
}

// ==================== REVENUE ====================

async function loadRevenue() {
    try {
        const token = localStorage.getItem('access_token');
        const res   = await fetch(`${API_BASE}/payments/`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load payments');
        const data  = await res.json();
        const payments = data.results || data;

        const total    = payments.filter(p => p.status === 'completed').reduce((s,p) => s + parseFloat(p.amount||0), 0);
        const listings = payments.filter(p => p.payment_type === 'listing_fee' && p.status === 'completed').reduce((s,p) => s + parseFloat(p.amount||0), 0);
        const featured = payments.filter(p => p.payment_type === 'featured_upgrade' && p.status === 'completed').reduce((s,p) => s + parseFloat(p.amount||0), 0);

        document.getElementById('rev-total').textContent    = `KES ${total.toLocaleString()}`;
        document.getElementById('rev-listings').textContent = `KES ${listings.toLocaleString()}`;
        document.getElementById('rev-featured').textContent = `KES ${featured.toLocaleString()}`;

        const tbody = document.getElementById('payments-tbody');
        if (!payments.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:30px;">No payments yet</td></tr>`;
            return;
        }

        tbody.innerHTML = payments.map(p => {
            const dated  = formatDateShort ? formatDateShort(p.created_at) : p.created_at?.split('T')[0];
            const status = p.status === 'completed' ? '<span style="color:#059669;font-weight:700;">Completed</span>' :
                           p.status === 'pending'   ? '<span style="color:#D97706;font-weight:700;">Pending</span>' :
                           '<span style="color:#DC2626;font-weight:700;">Failed</span>';
            return `<tr>
                <td>${p.landlord_name || p.landlord || '—'}</td>
                <td>${p.property_title || p.property || '—'}</td>
                <td>${p.payment_type?.replace('_',' ')}</td>
                <td>KES ${parseInt(p.amount).toLocaleString()}</td>
                <td style="font-size:11px;color:var(--color-text-muted);">${p.mpesa_transaction_id || '—'}</td>
                <td>${status}</td>
                <td>${dated}</td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error('Error loading revenue:', err);
        document.getElementById('rev-total').textContent = 'Error';
    }
}

// ==================== ACTIONS ====================

window.doVerifyLandlord = async (id) => {
    if (!confirm('Verify this landlord? They will be able to post listings.')) return;
    try {
        await verifyLandlord(id);
        showSuccess('Landlord verified successfully!');
        await loadUsers();
    } catch {
        showError('Failed to verify landlord');
    }
};

window.openRejectLandlordModal = (id) => {
    currentRejectLandlordId = id;
    document.getElementById('reject-landlord-modal').classList.add('active');
};

window.closeRejectLandlordModal = () => {
    document.getElementById('reject-landlord-modal').classList.remove('active');
    document.getElementById('reject-landlord-reason').value = '';
    currentRejectLandlordId = null;
};

window.submitLandlordRejection = async () => {
    const reason = document.getElementById('reject-landlord-reason').value.trim();
    if (!reason) { showError('Please provide a reason'); return; }
    try {
        const token = localStorage.getItem('access_token');
        await fetch(`${API_BASE}/admin/landlords/${currentRejectLandlordId}/reject/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ reason }),
        });
        showSuccess('Landlord rejected');
        closeRejectLandlordModal();
        await loadUsers();
    } catch {
        showError('Failed to reject landlord');
    }
};

window.doRevokeLandlord = async (id) => {
    if (!confirm('Revoke this landlord\'s verification? They will lose ability to post listings.')) return;
    try {
        const token = localStorage.getItem('access_token') ? JSON.parse(localStorage.getItem('access_token')) : null;
        await fetch(`${API_BASE}/admin/landlords/${id}/reject/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ reason: 'Verification revoked by admin' }),
        });
        showSuccess('Landlord verification revoked');
        await loadUsers();
    } catch {
        showError('Failed to revoke landlord');
    }
};

window.doApproveProperty = async (id) => {
    if (!confirm('Approve this property? It will become visible to tenants.')) return;
    try {
        await approveProperty(id);
        showSuccess('Property approved successfully!');
        await Promise.all([loadPendingProperties(), loadAllProperties()]);
        renderOverviewQueues();
    } catch (err) {
        console.error('Approve error:', err);
        showError('Failed to approve property. Please try again.');
    }
};

window.openRejectionModal = (id) => {
    currentRejectId = id;
    document.getElementById('rejection-modal').classList.add('active');
};

window.closeRejectionModal = () => {
    document.getElementById('rejection-modal').classList.remove('active');
    document.getElementById('rejection-reason').value = '';
    currentRejectId = null;
};

window.submitRejection = async () => {
    const reason = document.getElementById('rejection-reason').value.trim();
    if (!reason) { showError('Please provide a reason'); return; }
    try {
        await rejectProperty(currentRejectId, reason);
        showSuccess('Property rejected');
        closeRejectionModal();
        await loadPendingProperties();
        renderOverviewQueues();
    } catch (err) {
        console.error('Reject error:', err);
        showError('Failed to reject property');
    }
};

window.filterUsers = (role, btn) => {
    document.querySelectorAll('.user-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filtered = role === 'all' ? allUsers : allUsers.filter(u => u.role === role);
    renderUsersTable(filtered);
};

window.switchSection = (section) => {
    document.querySelectorAll('.dash-content').forEach(el => el.classList.remove('active'));
    document.getElementById(section)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${section}`)?.classList.add('active');
    document.querySelectorAll('.mobile-bottom-nav button').forEach(el => el.classList.remove('active'));
    document.getElementById(`mnav-${section}`)?.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.logoutUser = () => {
    clearTokens();
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};

document.addEventListener('DOMContentLoaded', init);
