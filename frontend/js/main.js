import { renderNavbar, renderFooter } from './utils.js';
import { getCurrentUser } from './auth.js';

const API = `${window.location.protocol}//${window.location.host}/api`;

const PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260'%3E%3Crect width='100%25' height='100%25' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14' font-family='sans-serif'%3ENo Photo%3C%2Ftext%3E%3C%2Fsvg%3E`;

// ── Sections that are only meaningful for tenants / public visitors
const TENANT_SECTION_IDS = [
    'hl-hero',
    'hl-featured-section',
    'hl-near-section',
    'hl-recent-section',
    'hl-sale-section',
    'hl-how-section',
    'hl-cta-section',
];

async function init() {
    try {
        const user = getCurrentUser();
        renderNavbar(user);
        if (typeof renderFooter === 'function') renderFooter();

        if (!user) {
            // Public / not logged in — full marketing page
            await loadPublicHomepage();
            return;
        }

        if (user.role === 'landlord') {
            hideTenantSections();
            await renderLandlordHomepage(user);
            return;
        }

        if (user.role === 'admin') {
            hideTenantSections();
            await renderAdminHomepage(user);
            return;
        }

        // Tenant — show full search page
        await loadPublicHomepage();

    } catch (err) {
        console.error('Homepage init error:', err);
    }
}

// ── Hide sections that are only for tenants/public ───────
function hideTenantSections() {
    TENANT_SECTION_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// ── Public / Tenant homepage ─────────────────────────────
async function loadPublicHomepage() {
    await Promise.all([
        loadAreas(),
        loadSection('featured-properties',    `${API}/properties/properties/featured/?limit=6`),
        loadSection('near-campus-properties', `${API}/properties/properties/near_campus/?limit=6`),
        loadSection('recent-properties',      `${API}/properties/properties/?ordering=-created_at&limit=6&is_available=true`),
        loadSection('sale-properties',        `${API}/properties/properties/for_sale/?limit=6`),
    ]);
    setupSearchForm();
}

// ── Landlord homepage ─────────────────────────────────────
async function renderLandlordHomepage(user) {
    const name = user.first_name || user.username;
    const token = localStorage.getItem('access_token');

    // Fetch their listing stats
    let stats = { total: 0, pending: 0, approved: 0, views: 0 };
    try {
        const res = await fetch(`${API}/properties/properties/my_listings/`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const data = await res.json();
            const listings = data.results || data;
            stats.total    = listings.length;
            stats.approved = listings.filter(l => l.is_approved).length;
            stats.pending  = listings.filter(l => !l.is_approved).length;
            stats.views    = listings.reduce((s, l) => s + (l.views_count || 0), 0);
        }
    } catch {}

    // Build the landlord homepage HTML and inject before the trust strip
    const strip = document.querySelector('.hl-trust') || document.querySelector('footer');
    const section = document.createElement('div');
    section.id = 'hl-landlord-home';
    section.innerHTML = landlordHomeHTML(name, stats, listings => listings);
    document.getElementById('navbar').insertAdjacentElement('afterend', section);

    // If they have listings, render them below the stats
    if (stats.total > 0) {
        try {
            const res = await fetch(`${API}/properties/properties/my_listings/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                const list = (data.results || data).slice(0, 6);
                renderMyListings(list);
            }
        } catch {}
    }
}

function landlordHomeHTML(name, stats) {
    return `
    <style>
        #hl-landlord-home { background: #f4f6f9; padding-bottom: 48px; }

        .ll-hero {
            background: linear-gradient(135deg, #1A2B4A 0%, #0f1c30 100%);
            padding: 48px 24px 40px;
            text-align: center;
            color: #fff;
        }
        .ll-hero-greeting { font-size: 13px; color: rgba(255,255,255,.6); margin-bottom: 6px; letter-spacing:.04em; text-transform:uppercase; }
        .ll-hero-name     { font-size: 28px; font-weight: 800; margin: 0 0 20px; }
        .ll-hero-actions  { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .ll-hero-btn {
            padding: 11px 24px; border-radius: 8px;
            font-size: 14px; font-weight: 700; text-decoration: none;
            display: inline-flex; align-items: center; gap: 6px;
            transition: transform .15s, opacity .15s;
        }
        .ll-hero-btn:hover { opacity: .9; transform: translateY(-1px); }
        .ll-hero-btn-primary { background: #1B7F4F; color: #fff; }
        .ll-hero-btn-outline { background: transparent; color: #fff; border: 2px solid rgba(255,255,255,.4); }

        .ll-stats {
            max-width: 900px; margin: -20px auto 0;
            display: grid; grid-template-columns: repeat(4, 1fr);
            gap: 12px; padding: 0 24px;
        }
        .ll-stat {
            background: #fff; border-radius: 12px;
            padding: 18px 16px; text-align: center;
            box-shadow: 0 2px 12px rgba(0,0,0,.06);
        }
        .ll-stat-val { font-size: 26px; font-weight: 800; color: #1A2B4A; }
        .ll-stat-lbl { font-size: 12px; color: #6b7280; margin-top: 2px; }

        .ll-listings-wrap {
            max-width: 900px; margin: 32px auto 0; padding: 0 24px;
        }
        .ll-listings-hdr {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 16px;
        }
        .ll-listings-hdr h2 { font-size: 18px; font-weight: 700; color: #1A2B4A; margin: 0; }
        .ll-listings-hdr a  { font-size: 13px; font-weight: 600; color: #1B7F4F; text-decoration: none; }
        .ll-listings-hdr a:hover { text-decoration: underline; }

        .ll-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 16px;
        }

        .ll-empty {
            text-align: center; padding: 48px 24px;
            background: #fff; border-radius: 12px;
            border: 2px dashed #e5e8ed;
        }
        .ll-empty p   { color: #6b7280; margin: 8px 0 20px; font-size: 14px; }
        .ll-empty h3  { color: #374151; font-size: 16px; margin: 0; }

        @media (max-width: 640px) {
            .ll-stats { grid-template-columns: 1fr 1fr; }
            .ll-hero-name { font-size: 22px; }
        }
    </style>

    <!-- Welcome hero -->
    <div class="ll-hero">
        <p class="ll-hero-greeting">Welcome back</p>
        <h1 class="ll-hero-name">${name}</h1>
        <div class="ll-hero-actions">
            <a href="create-listing.html" class="ll-hero-btn ll-hero-btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add New Listing
            </a>
            <a href="dashboard-landlord.html" class="ll-hero-btn ll-hero-btn-outline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                My Dashboard
            </a>
            <a href="profile.html" class="ll-hero-btn ll-hero-btn-outline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profile
            </a>
        </div>
    </div>

    <!-- Stats strip -->
    <div class="ll-stats">
        <div class="ll-stat">
            <div class="ll-stat-val">${stats.total}</div>
            <div class="ll-stat-lbl">Total Listings</div>
        </div>
        <div class="ll-stat">
            <div class="ll-stat-val" style="color:#1B7F4F">${stats.approved}</div>
            <div class="ll-stat-lbl">Live &amp; Approved</div>
        </div>
        <div class="ll-stat">
            <div class="ll-stat-val" style="color:#f59e0b">${stats.pending}</div>
            <div class="ll-stat-lbl">Pending Review</div>
        </div>
        <div class="ll-stat">
            <div class="ll-stat-val">${stats.views}</div>
            <div class="ll-stat-lbl">Total Views</div>
        </div>
    </div>

    <!-- My listings grid (populated by renderMyListings) -->
    <div class="ll-listings-wrap">
        <div class="ll-listings-hdr">
            <h2>Your Listings</h2>
            <a href="dashboard-landlord.html">Manage all →</a>
        </div>
        <div class="ll-grid" id="ll-my-listings">
            ${stats.total === 0 ? `
            <div class="ll-empty" style="grid-column:1/-1">
                <h3>No listings yet</h3>
                <p>Create your first listing and reach thousands of Pwani students.</p>
                <a href="create-listing.html" class="ll-hero-btn ll-hero-btn-primary" style="display:inline-flex;">Add Your First Listing</a>
            </div>` : ''}
        </div>
    </div>`;
}

function renderMyListings(list) {
    const grid = document.getElementById('ll-my-listings');
    if (!grid || !list.length) return;

    const pinSvg  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
    const homeSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

    grid.innerHTML = list.map(p => {
        const img   = p.primary_image?.image || null;
        const price = parseInt(p.rent_amount || 0).toLocaleString();
        const area  = p.location_area_name || 'Kilifi';
        const statusBadge = p.is_approved
            ? `<span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">Live</span>`
            : `<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">Pending</span>`;

        return `
        <div class="pc" style="cursor:pointer" onclick="location.href='property.html?id=${p.id}'" role="article">
            <div class="pc-img-wrap" style="height:160px;background:#e9ecf0;overflow:hidden;flex-shrink:0">
                ${img
                    ? `<img src="${img}" alt="${p.title}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
                    : `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#9ca3af">${homeSvg}<span style="font-size:12px">No photo</span></div>`
                }
            </div>
            <div style="padding:12px 14px 14px;display:flex;flex-direction:column;gap:5px;flex:1">
                <div style="display:flex;align-items:center;justify-content:space-between">${statusBadge}<span style="font-size:11px;color:#9ca3af">${p.views_count||0} views</span></div>
                <h3 style="font-size:13px;font-weight:700;color:#1A2B4A;margin:0;line-height:1.3">${p.title}</h3>
                <p style="font-size:12px;color:#6b7280;margin:0;display:flex;align-items:center;gap:3px">${pinSvg.replace('viewBox','style="width:11px;height:11px;stroke:#9ca3af" viewBox')} ${area}</p>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:8px;border-top:1px solid #f0f2f5">
                    <span style="font-size:15px;font-weight:800;color:#1A2B4A">KES ${price}<span style="font-size:11px;font-weight:400;color:#9ca3af">/mo</span></span>
                    <a href="create-listing.html?edit=${p.id}" style="font-size:11px;font-weight:700;color:#1B7F4F;text-decoration:none">Edit</a>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── Admin homepage ────────────────────────────────────────
async function renderAdminHomepage(user) {
    const name  = user.first_name || user.username;
    const token = localStorage.getItem('access_token');

    let pendingProps = 0, totalUsers = 0, unverifiedLandlords = 0;
    try {
        const [propRes, usersRes] = await Promise.all([
            fetch(`${API}/admin/properties/pending/`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/admin/users/`,              { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (propRes.ok) {
            const d = await propRes.json();
            pendingProps = (d.results || d).length;
        }
        if (usersRes.ok) {
            const d = await usersRes.json();
            const users = d.results || d;
            totalUsers = users.length;
            unverifiedLandlords = users.filter(u => u.role === 'landlord' && u.landlord_profile && !u.landlord_profile.is_verified).length;
        }
    } catch {}

    const section = document.createElement('div');
    section.id = 'hl-admin-home';
    section.innerHTML = adminHomeHTML(name, pendingProps, totalUsers, unverifiedLandlords);
    document.getElementById('navbar').insertAdjacentElement('afterend', section);
}

function adminHomeHTML(name, pendingProps, totalUsers, unverifiedLandlords) {
    const urgent = pendingProps + unverifiedLandlords;
    return `
    <style>
        #hl-admin-home { background: #f4f6f9; padding-bottom: 48px; }
        .ad-hero {
            background: linear-gradient(135deg, #1A2B4A 0%, #312e81 100%);
            padding: 48px 24px 40px; text-align: center; color: #fff;
        }
        .ad-hero-tag { font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:6px; }
        .ad-hero h1  { font-size:28px;font-weight:800;margin:0 0 8px; }
        .ad-hero p   { color:rgba(255,255,255,.65);font-size:14px;margin:0 0 24px; }
        .ad-hero-actions { display:flex;gap:12px;justify-content:center;flex-wrap:wrap; }
        .ad-btn { padding:10px 22px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:opacity .15s; }
        .ad-btn:hover { opacity:.85; }
        .ad-btn-primary { background:#7c3aed;color:#fff; }
        .ad-btn-outline { background:transparent;color:#fff;border:2px solid rgba(255,255,255,.4); }

        .ad-stats { max-width:860px;margin:-20px auto 0;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:0 24px; }
        .ad-stat  { background:#fff;border-radius:12px;padding:18px 16px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06); }
        .ad-stat-val { font-size:26px;font-weight:800;color:#1A2B4A; }
        .ad-stat-lbl { font-size:12px;color:#6b7280;margin-top:2px; }

        .ad-queue { max-width:860px;margin:32px auto 0;padding:0 24px;display:grid;grid-template-columns:1fr 1fr;gap:16px; }
        .ad-queue-card { background:#fff;border-radius:12px;padding:20px 22px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,.05); }
        .ad-queue-info h3 { font-size:15px;font-weight:700;color:#1A2B4A;margin:0 0 4px; }
        .ad-queue-info p  { font-size:13px;color:#6b7280;margin:0; }
        .ad-queue-count { font-size:32px;font-weight:800; }
        .ad-queue-count.urgent { color:#ef4444; }
        .ad-queue-count.ok     { color:#1B7F4F; }
        .ad-queue-btn { margin-top:12px;display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:#7c3aed;text-decoration:none; }
        .ad-queue-btn:hover { text-decoration:underline; }

        @media (max-width:640px) {
            .ad-stats { grid-template-columns:1fr 1fr; }
            .ad-queue { grid-template-columns:1fr; }
        }
    </style>

    <div class="ad-hero">
        <p class="ad-hero-tag">Admin Portal</p>
        <h1>Hello, ${name}</h1>
        <p>${urgent > 0 ? `⚠️ ${urgent} item${urgent>1?'s':''} need your attention` : 'Everything is up to date'}</p>
        <div class="ad-hero-actions">
            <a href="dashboard-admin.html" class="ad-btn ad-btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                Open Admin Dashboard
            </a>
            <a href="search.html" class="ad-btn ad-btn-outline">Browse Listings</a>
        </div>
    </div>

    <div class="ad-stats">
        <div class="ad-stat"><div class="ad-stat-val">${totalUsers}</div><div class="ad-stat-lbl">Total Users</div></div>
        <div class="ad-stat"><div class="ad-stat-val" style="color:#ef4444">${pendingProps}</div><div class="ad-stat-lbl">Pending Listings</div></div>
        <div class="ad-stat"><div class="ad-stat-val" style="color:#f59e0b">${unverifiedLandlords}</div><div class="ad-stat-lbl">Unverified Landlords</div></div>
        <div class="ad-stat"><div class="ad-stat-val" style="color:#1B7F4F">${totalUsers - unverifiedLandlords}</div><div class="ad-stat-lbl">Verified Users</div></div>
    </div>

    <div class="ad-queue">
        <div class="ad-queue-card">
            <div>
                <div class="ad-queue-info">
                    <h3>Pending Property Approvals</h3>
                    <p>Listings waiting for your review</p>
                </div>
                <a href="dashboard-admin.html#pending-properties" class="ad-queue-btn">Review now →</a>
            </div>
            <div class="ad-queue-count ${pendingProps > 0 ? 'urgent' : 'ok'}">${pendingProps}</div>
        </div>
        <div class="ad-queue-card">
            <div>
                <div class="ad-queue-info">
                    <h3>Unverified Landlords</h3>
                    <p>Landlords waiting for verification</p>
                </div>
                <a href="dashboard-admin.html#unverified-landlords" class="ad-queue-btn">Verify now →</a>
            </div>
            <div class="ad-queue-count ${unverifiedLandlords > 0 ? 'urgent' : 'ok'}">${unverifiedLandlords}</div>
        </div>
    </div>`;
}

// ── Shared helpers ────────────────────────────────────────
async function loadAreas() {
    try {
        const res  = await fetch(`${API}/properties/areas/`);
        const data = await res.json();
        const areas = data.results || data;
        const sel = document.getElementById('area-filter');
        if (!sel) return;
        areas.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id; opt.textContent = a.name;
            sel.appendChild(opt);
        });
    } catch {}
}

async function loadSection(containerId, url) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const res  = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = data.results || data;

        if (!list || !list.length) { container.innerHTML = buildEmpty(false); return; }
        container.innerHTML = list.map(createPropertyCard).join('');
    } catch {
        container.innerHTML = buildEmpty(true);
    }
}

function createPropertyCard(p) {
    const img      = p.primary_image?.image || p.images?.[0]?.image || null;
    const price    = parseInt(p.rent_amount || 0).toLocaleString();
    const area     = p.location_area_name || p.estate || 'Kilifi';
    const typeText = (p.property_type_display || p.property_type || '').replace(/_/g, ' ');
    const dist     = p.distance_display || '';

    const badges = [];
    if (p.is_featured) badges.push('<span class="pc-badge pc-badge-featured">Featured</span>');
    if (p.is_verified) badges.push('<span class="pc-badge pc-badge-verified">Verified</span>');
    if (dist)          badges.push(`<span class="pc-badge pc-badge-campus">${dist}</span>`);

    const locPinSvg = `<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
    const noImgSvg  = `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    const arrSvg    = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

    return `
    <div class="prop-card" onclick="window.location.href='property.html?id=${p.id}'" role="article" tabindex="0" onkeydown="if(event.key==='Enter')window.location.href='property.html?id=${p.id}'">
        <div class="prop-card-img-wrap">
            ${img ? `<img src="${img}" alt="${p.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
            <div class="prop-card-no-img" style="${img ? 'display:none' : ''}">
                ${noImgSvg}<span>No photo yet</span>
            </div>
            ${badges.length ? `<div class="prop-card-badges">${badges.join('')}</div>` : ''}
        </div>
        <div class="prop-card-body">
            ${typeText ? `<span class="prop-type-tag">${typeText}</span>` : ''}
            <h3 class="prop-card-title">${p.title}</h3>
            <p class="prop-card-loc">${locPinSvg} ${area}</p>
            <div class="prop-card-footer">
                <div class="prop-card-price">KES ${price}<span>/mo</span></div>
                <span class="prop-card-cta">View ${arrSvg}</span>
            </div>
        </div>
    </div>`;
}

function buildEmpty(isError = false) {
    const title = isError ? 'No listings available right now' : 'No listings in this section yet';
    const sub   = isError ? 'The server may be starting up — try refreshing in a moment.' : 'Check back soon as new properties are added regularly.';
    return `
    <div class="hl-empty">
        <div class="hl-empty-icon">
            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <h4>${title}</h4>
        <p>${sub}</p>
        <a href="search.html" class="hl-empty-link">Browse all properties &rarr;</a>
    </div>`;
}

function setupSearchForm() {
    const form = document.getElementById('hero-search-form');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const area    = document.getElementById('area-filter')?.value;
        const type    = document.getElementById('type-filter')?.value;
        const maxRent = document.getElementById('max-rent')?.value;
        const params  = [];
        if (area)    params.push(`location_area=${area}`);
        if (type)    params.push(`property_type=${type}`);
        if (maxRent) params.push(`max_rent=${maxRent}`);
        window.location.href = 'search.html' + (params.length ? '?' + params.join('&') : '');
    });
}

document.addEventListener('DOMContentLoaded', init);
