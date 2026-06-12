import { renderNavbar, showSuccess, showError, formatCurrency, formatDateShort } from './utils.js';
import { getMyListings, deleteProperty, getInquiries, updateProfile as apiUpdateProfile, getProfile } from './api.js';
import { getCurrentUser, requireRole, clearTokens } from './auth.js';

let allListings = [];
let allInquiries = [];
let currentPromoType = '';
let isVerified = false;
const PLACEHOLDER = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="75"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="11">No Photo</text></svg>';

async function init() {
    requireRole('landlord');
    const user = getCurrentUser();
    renderNavbar(user);

    // Sidebar name
    document.getElementById('sidebar-name').textContent =
        `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

    // Check verification status
    try {
        const profile = await getProfile();
        isVerified = profile?.landlord_profile?.is_verified || profile?.is_verified || false;
        updateVerificationUI(isVerified, user);
    } catch {
        isVerified = false;
        updateVerificationUI(false, user);
    }

    await Promise.all([loadListings(), loadInquiries()]);
    loadAccountForm();
}

function updateVerificationUI(verified, user) {
    const badge    = document.getElementById('verification-badge');
    const banner   = document.getElementById('verification-banner');
    const newBtn   = document.getElementById('new-listing-btn');
    const newBtn2  = document.getElementById('new-listing-btn-2');
    const aIcon    = document.getElementById('acct-verify-icon');
    const aTitle   = document.getElementById('acct-verify-title');
    const aDesc    = document.getElementById('acct-verify-desc');

    if (verified) {
        badge.className = 'sidebar-badge badge-verified';
        badge.textContent = '✅ Verified Landlord';
        banner.style.display = 'none';
        if (newBtn)  newBtn.style.display  = 'inline-flex';
        if (newBtn2) newBtn2.style.display = 'inline-flex';
        aIcon.textContent  = '✅';
        aTitle.textContent = 'Verified Landlord';
        aDesc.textContent  = 'Your account is verified. You can post and manage listings.';
        aDesc.style.color  = '#059669';
    } else {
        badge.className = 'sidebar-badge badge-pending';
        badge.textContent = '⏳ Pending';
        banner.style.display = 'flex';
        if (newBtn)  { newBtn.style.display  = 'none'; }
        if (newBtn2) { newBtn2.textContent = '⚠️ Requires Verification'; newBtn2.className = 'btn btn-sm'; newBtn2.href = '#'; newBtn2.onclick = () => showError('Your account is pending verification. Please wait for our team to contact you.'); }
        aIcon.textContent  = '⏳';
        aTitle.textContent = 'Pending Verification';
        aDesc.textContent  = 'Our team will contact you within 24–48 hours to complete verification.';
    }
}

// ==================== LISTINGS ====================

async function loadListings() {
    try {
        allListings = await getMyListings();
        updateStats();
        renderRecentListings();
        renderAllListings();
        renderAnalytics();
        populatePromoteSelect();
    } catch (err) {
        console.error('Error loading listings:', err);
        document.getElementById('all-listings-container').innerHTML =
            '<p style="color:var(--color-danger);text-align:center;padding:20px;">Failed to load listings. Please refresh.</p>';
    }
}

function updateStats() {
    const active   = allListings.filter(l => l.is_approved && l.is_available).length;
    const pending  = allListings.filter(l => !l.is_approved).length;
    const occupied = allListings.filter(l => l.is_approved && !l.is_available).length;
    const views    = allListings.reduce((s, l) => s + (l.views_count || 0), 0);
    const featured = allListings.filter(l => l.is_featured).length;

    document.getElementById('stat-active').textContent   = active;
    document.getElementById('stat-pending').textContent  = pending;
    document.getElementById('stat-occupied').textContent = occupied;
    document.getElementById('stat-views').textContent    = views;
    document.getElementById('stat-featured').textContent = featured;
    document.getElementById('stat-inquiries').textContent = allInquiries.length;

    const pendingBadge = document.getElementById('badge-pending-props');
    pendingBadge.textContent = pending;
    pendingBadge.classList.toggle('show', pending > 0);
}

function buildPropertyRow(listing) {
    const img   = listing.images?.[0]?.image || PLACEHOLDER;
    const rent  = formatCurrency ? formatCurrency(listing.rent_amount) : `KES ${parseInt(listing.rent_amount).toLocaleString()}`;
    const area  = listing.location_area_name || listing.estate || 'Kilifi';
    const inqs  = allInquiries.filter(i => i.property === listing.id || i.property_id === listing.id).length;

    let statusBadge = '';
    if (!listing.is_approved) statusBadge += '<span class="prop-badge badge-pending">Pending</span>';
    else if (!listing.is_available) statusBadge += '<span class="prop-badge badge-occupied">Occupied</span>';
    else statusBadge += '<span class="prop-badge badge-active">Active</span>';
    if (listing.is_featured) statusBadge += '<span class="prop-badge badge-featured">Featured</span>';

    return `
        <div class="property-row" data-status="${!listing.is_approved ? 'pending' : (listing.is_available ? 'active' : 'occupied')}">
            <img src="${img}" class="property-thumb" onerror="this.src='${PLACEHOLDER}'" alt="${listing.title}">
            <div>
                <div class="prop-title">${listing.title}</div>
                <div class="prop-meta">
                    <span>📍 ${area}</span>
                    <span>💰 ${rent}/mo</span>
                    <span>👁 ${listing.views_count || 0} views</span>
                    <span>💬 ${inqs} inquiries</span>
                </div>
                <div class="prop-badges">${statusBadge}</div>
            </div>
            <div class="prop-actions">
                <a href="property.html?id=${listing.id}" class="btn btn-sm btn-secondary">View</a>
                <a href="create-listing.html?id=${listing.id}" class="btn btn-sm btn-secondary">Edit</a>
                ${listing.is_available && listing.is_approved
                    ? `<button class="btn btn-sm btn-secondary" onclick="markOccupied(${listing.id})">Mark Occupied</button>`
                    : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteListing(${listing.id})">Delete</button>
            </div>
        </div>`;
}

function renderRecentListings() {
    const container = document.getElementById('recent-listings-container');
    if (!allListings.length) {
        const actionBtn = isVerified
            ? `<a href="create-listing.html" class="btn btn-primary">+ Create Listing</a>`
            : `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;font-size:13px;color:#92400e;margin-top:8px;">
                   <strong>Your account is pending verification.</strong><br>
                   Our team will contact you on WhatsApp within 24–48 hours.
                   Once verified, you can start listing your property.
                   <br><a href="https://wa.me/254757734299" target="_blank" style="color:#92400e;font-weight:700;">Contact us to speed up verification →</a>
               </div>`;
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏠</div>
                <h3>No listings yet</h3>
                <p>Create your first listing to start getting inquiries from students.</p>
                ${actionBtn}
            </div>`;
        return;
    }
    const recent = allListings.slice(0, 3);
    container.innerHTML = `<div class="property-list">${recent.map(buildPropertyRow).join('')}</div>`;
}

function renderAllListings(filter = 'all') {
    const container = document.getElementById('all-listings-container');
    let filtered = allListings;
    if (filter === 'active')   filtered = allListings.filter(l => l.is_approved && l.is_available);
    if (filter === 'pending')  filtered = allListings.filter(l => !l.is_approved);
    if (filter === 'occupied') filtered = allListings.filter(l => l.is_approved && !l.is_available);

    if (!filtered.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏠</div><h3>No listings found</h3></div>`;
        return;
    }
    container.innerHTML = filtered.map(buildPropertyRow).join('');
}

// ==================== INQUIRIES ====================

async function loadInquiries() {
    try {
        allInquiries = await getInquiries();
        const unread = allInquiries.filter(i => i.status === 'pending').length;
        const badge  = document.getElementById('badge-inquiries');
        badge.textContent = unread;
        badge.classList.toggle('show', unread > 0);
        renderInquiries();
        renderRecentInquiries();
    } catch (err) {
        console.error('Error loading inquiries:', err);
    }
}

function buildInquiryCard(inq) {
    const name    = inq.tenant_name || inq.tenant?.first_name || 'Student';
    const prop    = inq.property_title || inq.property?.title || 'Property';
    const phone   = inq.tenant?.phone_number || inq.tenant_phone || '';
    const waPhone = phone.replace(/\D/g, '');
    const dated   = formatDateShort ? formatDateShort(inq.created_at) : inq.created_at?.split('T')[0];

    return `
        <div class="inquiry-card">
            <div class="inq-header">
                <div class="inq-from">👤 ${name}</div>
                <div class="inq-date">${dated}</div>
            </div>
            <div class="inq-prop">📍 ${prop}</div>
            <div class="inq-msg">${inq.message}</div>
            <div style="display:flex;gap:var(--spacing-sm);flex-wrap:wrap;">
                ${waPhone ? `<a href="https://wa.me/${waPhone}?text=Hello+${encodeURIComponent(name)}%2C+I+saw+your+inquiry+on+HomLink" target="_blank" class="btn btn-sm btn-primary">📱 WhatsApp Reply</a>` : ''}
                ${phone ? `<a href="tel:${phone}" class="btn btn-sm btn-secondary">📞 Call</a>` : ''}
                <span class="prop-badge badge-${inq.status === 'pending' ? 'pending' : 'active'}" style="align-self:center;">${inq.status}</span>
            </div>
        </div>`;
}

function renderInquiries(filter = 'all') {
    const container = document.getElementById('inquiries-container');
    let filtered = allInquiries;
    if (filter === 'pending')   filtered = allInquiries.filter(i => i.status === 'pending');
    if (filter === 'responded') filtered = allInquiries.filter(i => i.status === 'responded');

    if (!filtered.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><h3>No inquiries</h3><p>Student inquiries from your listings will appear here.</p></div>`;
        return;
    }
    container.innerHTML = filtered.map(buildInquiryCard).join('');
}

function renderRecentInquiries() {
    const container = document.getElementById('recent-inquiries-container');
    if (!allInquiries.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><h3>No inquiries yet</h3></div>`;
        return;
    }
    container.innerHTML = allInquiries.slice(0, 3).map(buildInquiryCard).join('');
}

// ==================== ANALYTICS ====================

function renderAnalytics() {
    // Top by views
    const byViews = [...allListings].sort((a,b) => (b.views_count||0) - (a.views_count||0)).slice(0, 5);
    document.getElementById('analytics-views').innerHTML = byViews.length
        ? byViews.map(l => `<div class="perf-row"><span class="perf-label">${l.title}</span><span class="perf-value">${l.views_count||0} views</span></div>`).join('')
        : '<p style="text-align:center;color:var(--color-text-muted);">No data</p>';

    // Top by inquiries
    const withInqs = allListings.map(l => ({
        ...l,
        inqCount: allInquiries.filter(i => i.property === l.id || i.property_id === l.id).length
    })).sort((a,b) => b.inqCount - a.inqCount).slice(0, 5);
    document.getElementById('analytics-inquiries').innerHTML = withInqs.length
        ? withInqs.map(l => `<div class="perf-row"><span class="perf-label">${l.title}</span><span class="perf-value">${l.inqCount} inquiries</span></div>`).join('')
        : '<p style="text-align:center;color:var(--color-text-muted);">No data</p>';

    // Top by favorites
    const byFavs = [...allListings].sort((a,b) => (b.favorites_count||0) - (a.favorites_count||0)).slice(0, 5);
    document.getElementById('analytics-favorites').innerHTML = byFavs.length
        ? byFavs.map(l => `<div class="perf-row"><span class="perf-label">${l.title}</span><span class="perf-value">${l.favorites_count||0} saves</span></div>`).join('')
        : '<p style="text-align:center;color:var(--color-text-muted);">No data</p>';

    // Summary
    const totalViews = allListings.reduce((s,l) => s+(l.views_count||0), 0);
    const totalFavs  = allListings.reduce((s,l) => s+(l.favorites_count||0), 0);
    document.getElementById('analytics-summary').innerHTML = `
        <div class="perf-row"><span class="perf-label">Total Listings</span><span class="perf-value">${allListings.length}</span></div>
        <div class="perf-row"><span class="perf-label">Total Views</span><span class="perf-value">${totalViews}</span></div>
        <div class="perf-row"><span class="perf-label">Total Inquiries</span><span class="perf-value">${allInquiries.length}</span></div>
        <div class="perf-row"><span class="perf-label">Total Favorites</span><span class="perf-value">${totalFavs}</span></div>
        <div class="perf-row"><span class="perf-label">Active Listings</span><span class="perf-value">${allListings.filter(l=>l.is_approved&&l.is_available).length}</span></div>
        <div class="perf-row"><span class="perf-label">Featured Listings</span><span class="perf-value">${allListings.filter(l=>l.is_featured).length}</span></div>
    `;
}

function populatePromoteSelect() {
    const sel = document.getElementById('promote-property-select');
    sel.innerHTML = '<option value="">Choose a property...</option>';
    allListings.filter(l => l.is_approved).forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = l.title;
        sel.appendChild(opt);
    });
}

// ==================== ACCOUNT FORM ====================

function loadAccountForm() {
    const user = getCurrentUser();
    if (!user) return;
    document.getElementById('acct-first-name').value = user.first_name || '';
    document.getElementById('acct-last-name').value  = user.last_name || '';
    document.getElementById('acct-email').value      = user.email || '';
    document.getElementById('acct-phone').value      = user.phone_number || '';
    document.getElementById('acct-whatsapp').value   = user.whatsapp_number || '';
    document.getElementById('acct-bio').value        = user.bio || '';
}

// ==================== WINDOW HANDLERS ====================

window.switchSection = (section) => {
    document.querySelectorAll('.dash-content').forEach(el => el.classList.remove('active'));
    document.getElementById(section)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${section}`)?.classList.add('active');
};

window.filterProps = (filter, btn) => {
    document.querySelectorAll('.prop-filter').forEach(b => b.classList.remove('active', 'btn-primary'));
    btn.classList.add('active');
    renderAllListings(filter);
};

window.filterInquiries = (status, btn) => {
    document.querySelectorAll('.inq-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderInquiries(status);
};

window.deleteListing = async (id) => {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    try {
        await deleteProperty(id);
        showSuccess('Listing deleted');
        await loadListings();
    } catch {
        showError('Failed to delete listing');
    }
};

window.markOccupied = async (id) => {
    if (!confirm('Mark this property as occupied?')) return;
    try {
        const token = localStorage.getItem('access_token');
        await fetch(`http://localhost:8000/api/properties/${id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ is_available: false }),
        });
        showSuccess('Property marked as occupied');
        await loadListings();
    } catch {
        showError('Failed to update property');
    }
};

window.openPromoteModal = (type) => {
    currentPromoType = type;
    document.getElementById('modal-title').textContent = type === 'featured' ? '⭐ Featured Listing — KES 500 / 7 days' : '🏆 Premium Listing — KES 1,000 / 30 days';
    document.getElementById('promote-modal').classList.add('active');
};

window.closePromoteModal = () => {
    document.getElementById('promote-modal').classList.remove('active');
};

window.submitPromotion = async () => {
    const propId = document.getElementById('promote-property-select').value;
    const phone  = document.getElementById('promote-phone').value.trim();
    if (!propId) { showError('Please select a property'); return; }
    if (!phone)  { showError('Please enter your M-Pesa phone number'); return; }

    try {
        const amount = currentPromoType === 'featured' ? 500 : 1000;
        const token  = localStorage.getItem('access_token');
        await fetch('http://localhost:8000/api/payments/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ phone_number: phone, amount, payment_type: 'featured_upgrade', property_id: parseInt(propId) }),
        });
        showSuccess('M-Pesa prompt sent to ' + phone + '. Complete payment to activate promotion.');
        closePromoteModal();
    } catch {
        showError('Failed to initiate payment. Please try again.');
    }
};

window.saveProfile = async () => {
    const data = {
        first_name: document.getElementById('acct-first-name').value.trim(),
        last_name:  document.getElementById('acct-last-name').value.trim(),
        phone_number: document.getElementById('acct-phone').value.trim(),
        whatsapp_number: document.getElementById('acct-whatsapp').value.trim(),
        bio: document.getElementById('acct-bio').value.trim(),
    };
    try {
        const updated = await apiUpdateProfile(data);
        const user = getCurrentUser();
        Object.assign(user, data);
        localStorage.setItem('user', JSON.stringify(user));
        showSuccess('Profile updated successfully');
    } catch {
        showError('Failed to update profile');
    }
};

window.logoutUser = () => {
    clearTokens();
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};

document.addEventListener('DOMContentLoaded', init);
