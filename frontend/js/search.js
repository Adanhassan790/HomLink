import { renderNavbar, renderFooter } from './utils.js';
import { getCurrentUser } from './auth.js';

const API = `${window.location.protocol}//${window.location.host}/api`;

const TYPE_LABELS = {
    single_room: 'Single Room', bedsitter: 'Bedsitter', studio: 'Studio',
    '1br': '1 Bedroom', '2br': '2 Bedroom', '3br': '3 Bedroom',
    maisonette: 'Maisonette', commercial: 'Commercial',
};

let currentPage = 1;
let totalCount = 0;
const PAGE_SIZE = 12;

// ── Init ──────────────────────────────────────────────────
async function init() {
    const user = getCurrentUser();
    renderNavbar(user);
    if (typeof renderFooter === 'function') renderFooter();

    showSkeletons();

    await Promise.all([loadAreas(), loadAmenities()]);
    setupListeners();
    readUrlParams();
    await loadProperties();
}

// ── Sidebar data ──────────────────────────────────────────
const KILIFI_AREA_NAMES = [
    'Bofa','Charo wa Mae','Kaya','Kibaoni','Kisumu Ndogo',
    'Kiwandani','Kwa Mwango','Mabirikani','Makao','Marembo',
    'Misufini','Mnarani','Mtaani','Zimbabwe',
];

async function loadAreas() {
    const sel = document.getElementById('sf-area');
    if (!sel) return;
    try {
        const res   = await fetch(`${API}/properties/areas/`);
        const data  = await res.json();
        const areas = data.results || data;
        if (areas.length) {
            areas.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id; opt.textContent = a.name;
                sel.appendChild(opt);
            });
            return;
        }
    } catch {}
    KILIFI_AREA_NAMES.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        sel.appendChild(opt);
    });
}

async function loadAmenities() {
    try {
        const res = await fetch(`${API}/properties/amenities/`);
        const data = await res.json();
        const amenities = data.results || data;
        const container = document.getElementById('sf-amenities');
        if (!amenities.length) { container.innerHTML = '<span style="font-size:12px;color:#9ca3af;">None available</span>'; return; }
        container.innerHTML = amenities.map(a =>
            `<label class="sf-check-label"><input type="checkbox" class="sf-amenity" value="${a.id}"> ${a.name}</label>`
        ).join('');
    } catch {
        document.getElementById('sf-amenities').innerHTML = '';
    }
}

// ── Event listeners ───────────────────────────────────────
function setupListeners() {
    document.getElementById('sf-dist').addEventListener('input', e => {
        document.getElementById('sf-dist-val').textContent = `${e.target.value} km`;
    });

    document.getElementById('sf-apply').addEventListener('click', () => { currentPage = 1; loadProperties(); });
    document.getElementById('sf-clear').addEventListener('click', clearFilters);
    document.getElementById('sp-sort').addEventListener('change', () => { currentPage = 1; loadProperties(); });

    document.getElementById('sp-mob-toggle').addEventListener('click', () => {
        document.getElementById('sp-sidebar').classList.toggle('open');
    });

    ['sf-min', 'sf-max'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Enter') { currentPage = 1; loadProperties(); }
        });
    });
}

// ── Build filter params ───────────────────────────────────
function getParams() {
    const p = new URLSearchParams();

    const area = document.getElementById('sf-area').value;
    if (area) p.set('location_area', area);

    const type = document.getElementById('sf-type').value;
    if (type) p.set('property_type', type);

    const min = document.getElementById('sf-min').value;
    const max = document.getElementById('sf-max').value;
    if (min) p.set('min_rent', min);
    if (max) p.set('max_rent', max);

    const dist = document.getElementById('sf-dist').value;
    if (dist && dist !== '5') p.set('max_distance', dist);

    if (document.getElementById('sf-near-campus').checked) p.set('max_distance', '1');

    document.querySelectorAll('.sf-amenity:checked').forEach(el => p.append('amenities', el.value));

    if (document.getElementById('sf-furnished').checked)  p.set('furnished', 'true');
    if (document.getElementById('sf-wifi').checked)       p.set('has_wifi', 'true');
    if (document.getElementById('sf-security').checked)   p.set('has_security', 'true');

    const sort = document.getElementById('sp-sort').value;
    if (sort) p.set('ordering', sort);

    p.set('is_available', 'true');
    p.set('page', currentPage);
    p.set('page_size', PAGE_SIZE);

    return p;
}

// ── Load & render properties ──────────────────────────────
async function loadProperties() {
    showSkeletons();
    document.getElementById('sp-chips').style.display = 'none';

    const params = getParams();
    window.history.replaceState({}, '', `?${params.toString()}`);

    try {
        const res = await fetch(`${API}/properties/properties/?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const list = data.results || data;
        totalCount = data.count ?? list.length;

        document.getElementById('sp-count').textContent = totalCount;

        renderGrid(list);
        renderPagination(data);
        renderChips(params);
    } catch (err) {
        console.error('loadProperties:', err);
        document.getElementById('sp-count').textContent = '0';
        document.getElementById('sp-grid').innerHTML = buildEmpty(true);
        document.getElementById('sp-pagination').innerHTML = '';
    }
}

// ── Grid ──────────────────────────────────────────────────
function renderGrid(list) {
    const grid = document.getElementById('sp-grid');
    if (!list || !list.length) {
        grid.innerHTML = buildEmpty(false);
        return;
    }
    grid.innerHTML = list.map(buildCard).join('');
}

function buildCard(p) {
    const img     = p.primary_image?.image || null;
    const price   = parseInt(p.rent_amount || 0).toLocaleString();
    const area    = p.location_area_name || 'Kilifi';
    const typeStr = TYPE_LABELS[p.property_type] || (p.property_type || '').replace(/_/g, ' ');
    const dist    = p.distance_display || '';
    const estate  = (p.estate || '').trim();

    let heroBadge = '';
    if (p.is_featured)      heroBadge = `<div class="pc-hero-badge pc-hb-featured">★ Featured</div>`;
    else if (p.is_verified) heroBadge = `<div class="pc-hero-badge pc-hb-verified">✓ Verified</div>`;

    return `
    <div class="pc" role="article" tabindex="0"
        onclick="location.href='property.html?id=${p.id}'"
        onkeydown="if(event.key==='Enter')location.href='property.html?id=${p.id}'">

        <div class="pc-img-wrap">
            ${img
                ? `<img src="${img}" alt="${p.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                : ''
            }
            <div class="pc-no-img" style="${img ? 'display:none' : ''}">
                <span class="pc-no-img-icon">🏠</span>
                <span class="pc-no-img-label">No photo yet</span>
            </div>
            ${heroBadge}
        </div>

        <div class="pc-details">
            <h3 class="pc-title">${p.title}</h3>
            <div class="pc-feat-row">
                <span class="pc-feat-icon">📍</span>
                <span>${area}${estate ? ` &middot; ${estate}` : ''}</span>
            </div>
            <div class="pc-feat-row">
                <span class="pc-feat-icon">🏠</span>
                <span>${typeStr}</span>
            </div>
            ${dist ? `
            <div class="pc-feat-row">
                <span class="pc-feat-icon">📏</span>
                <span>${dist} from Kilifi Town</span>
            </div>` : ''}
        </div>

        <div class="pc-price-bar">
            <div>
                <div class="pc-from">from</div>
                <div class="pc-amount">KES ${price}<span class="pc-period"> /mo</span></div>
            </div>
            <button class="pc-select-btn" onclick="event.stopPropagation();location.href='property.html?id=${p.id}'">VIEW PROPERTY ›</button>
        </div>
    </div>`;
}

// ── Skeleton ──────────────────────────────────────────────
function showSkeletons() {
    const grid = document.getElementById('sp-grid');
    grid.innerHTML = Array.from({ length: 6 }, () => `
        <div class="pc-skel">
            <div class="skel-img"></div>
            <div class="skel-body">
                <div class="skel-line" style="width:80%"></div>
                <div class="skel-line" style="width:55%"></div>
                <div class="skel-line" style="width:45%"></div>
            </div>
            <div style="padding:13px 18px;background:#f8fafb;display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <div style="display:flex;flex-direction:column;gap:5px;">
                    <div class="skel-line" style="width:30px;height:9px"></div>
                    <div class="skel-line" style="width:110px;height:18px"></div>
                </div>
                <div class="skel-line" style="width:110px;height:36px;border-radius:8px"></div>
            </div>
        </div>`).join('');
    document.getElementById('sp-pagination').innerHTML = '';
}

// ── Empty state ───────────────────────────────────────────
function buildEmpty(isError) {
    const title = isError ? 'Could not load listings' : 'No properties match your filters';
    const sub   = isError
        ? 'The server may be starting up — try refreshing in a moment.'
        : 'Try widening your search — adjust the price range, area, or remove some filters.';
    return `
    <div class="sp-empty">
        <div class="sp-empty-icon">
            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <h4>${title}</h4>
        <p>${sub}</p>
        <button class="sf-apply" style="margin:0 auto;width:auto;padding:10px 24px" onclick="clearFilters()">Clear all filters</button>
    </div>`;
}

// ── Active-filter chips ───────────────────────────────────
function renderChips(params) {
    const box = document.getElementById('sp-chips');
    const chips = [];

    const labels = {
        location_area: 'Area', property_type: (v) => TYPE_LABELS[v] || v,
        min_rent: (v) => `Min KES ${parseInt(v).toLocaleString()}`,
        max_rent: (v) => `Max KES ${parseInt(v).toLocaleString()}`,
        max_distance: (v) => `Within ${v} km`,
        furnished: 'Furnished', has_wifi: 'WiFi', has_security: 'Security',
    };

    for (const [key, val] of params.entries()) {
        if (['is_available', 'page', 'page_size', 'ordering'].includes(key)) continue;
        const labelFn = labels[key];
        if (!labelFn) continue;
        const text = typeof labelFn === 'function' ? labelFn(val) : labelFn;
        chips.push(`<span class="sp-filter-chip">${text}<button title="Remove" onclick="removeChip('${key}')">×</button></span>`);
    }

    if (chips.length) {
        box.innerHTML = chips.join('') + `<button class="sp-filter-chip" style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5" onclick="clearFilters()">Clear all ×</button>`;
        box.style.display = 'flex';
    }
}

// ── Pagination ────────────────────────────────────────────
function renderPagination(data) {
    const container = document.getElementById('sp-pagination');
    const total = data.count || totalCount;
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    html += `<button class="sp-pg-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goPage(${currentPage - 1})">&#8592;</button>`;

    for (let i = Math.max(1, currentPage - 2); i <= Math.min(pages, currentPage + 2); i++) {
        html += `<button class="sp-pg-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    }
    if (currentPage + 2 < pages) html += `<span style="color:#9ca3af;padding:0 4px">…</span><button class="sp-pg-btn" onclick="goPage(${pages})">${pages}</button>`;

    html += `<button class="sp-pg-btn" ${currentPage === pages ? 'disabled' : ''} onclick="goPage(${currentPage + 1})">&#8594;</button>`;
    container.innerHTML = html;
}

// ── URL params ────────────────────────────────────────────
function readUrlParams() {
    const p = new URLSearchParams(window.location.search);

    if (p.get('location_area')) {
        const sel = document.getElementById('sf-area');
        sel.value = p.get('location_area');
    }
    if (p.get('property_type')) document.getElementById('sf-type').value = p.get('property_type');
    if (p.get('min_rent'))  document.getElementById('sf-min').value = p.get('min_rent');
    if (p.get('max_rent'))  document.getElementById('sf-max').value = p.get('max_rent');
    if (p.get('max_distance')) {
        const d = p.get('max_distance');
        document.getElementById('sf-dist').value = d;
        document.getElementById('sf-dist-val').textContent = `${d} km`;
    }
    if (p.get('furnished'))    document.getElementById('sf-furnished').checked   = true;
    if (p.get('has_wifi'))     document.getElementById('sf-wifi').checked        = true;
    if (p.get('has_security')) document.getElementById('sf-security').checked    = true;
    if (p.get('ordering'))     document.getElementById('sp-sort').value          = p.get('ordering');
    if (p.get('page'))         currentPage = parseInt(p.get('page')) || 1;
}

// ── Global helpers (for onclick in HTML) ─────────────────
function clearFilters() {
    document.getElementById('sf-area').value = '';
    document.getElementById('sf-type').value = '';
    document.getElementById('sf-min').value  = '';
    document.getElementById('sf-max').value  = '';
    document.getElementById('sf-dist').value = '5';
    document.getElementById('sf-dist-val').textContent = '5 km';
    document.getElementById('sf-furnished').checked   = false;
    document.getElementById('sf-wifi').checked        = false;
    document.getElementById('sf-security').checked    = false;
    document.getElementById('sf-near-campus').checked = false;
    document.querySelectorAll('.sf-amenity').forEach(el => el.checked = false);
    document.getElementById('sp-sort').value = '-created_at';
    currentPage = 1;
    loadProperties();
}
window.clearFilters = clearFilters;

function goPage(n) {
    currentPage = n;
    loadProperties();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.goPage = goPage;

function removeChip(key) {
    const fieldMap = {
        location_area: () => { document.getElementById('sf-area').value = ''; },
        property_type: () => { document.getElementById('sf-type').value = ''; },
        min_rent:      () => { document.getElementById('sf-min').value  = ''; },
        max_rent:      () => { document.getElementById('sf-max').value  = ''; },
        max_distance:  () => { document.getElementById('sf-dist').value = '5'; document.getElementById('sf-dist-val').textContent = '5 km'; document.getElementById('sf-near-campus').checked = false; },
        furnished:     () => { document.getElementById('sf-furnished').checked   = false; },
        has_wifi:      () => { document.getElementById('sf-wifi').checked        = false; },
        has_security:  () => { document.getElementById('sf-security').checked    = false; },
    };
    if (fieldMap[key]) { fieldMap[key](); currentPage = 1; loadProperties(); }
}
window.removeChip = removeChip;

document.addEventListener('DOMContentLoaded', init);
