import { renderNavbar, showSuccess, showError, getLocalStorage } from './utils.js';
import { getCurrentUser } from './auth.js';

const API = `${window.location.protocol}//${window.location.host}/api`;
const TOTAL = 9;

const STEP_TITLES = [
    'Basic Information', 'Amenities', 'Room Photos', 'Compound Photos',
    'Building Photos', 'Video Tours', 'Pin Location', 'Preview Listing',
    'Submitted',
];

const AMENITY_ICONS = {
    wifi: '📶', parking: '🚗', water: '💧', security: '🔒',
    electricity: '⚡', balcony: '🪟', furnished: '🛋', kitchen: '🍳',
    laundry: '🧺', study_space: '📚',
};

let currentStep       = 1;
let selectedAmenities = [];
let uploadedPhotos    = { room: {}, compound: {}, building: {} };
let uploadedVideos    = {};
let areasData         = [];
let amenitiesData     = [];
let createdPropertyId = null;
let paymentId         = null;
let paymentPolling    = null;
let editMode          = false;
let editPropertyId    = null;

// Leaflet map
let map = null;
let marker = null;

// ── Init ─────────────────────────────────────────────────
async function init() {
    const user = getCurrentUser();

    // Not logged in
    if (!user) { window.location.href = 'login.html'; return; }

    // Not a landlord
    if (user.role !== 'landlord') {
        showError('Only landlords can create listings.');
        window.location.href = 'index.html';
        return;
    }

    renderNavbar(user);

    // Check verification status from the server (localStorage may be stale)
    try {
        const token = getLocalStorage('access_token');
        const res = await fetch(`${API}/auth/me/`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { window.location.href = 'login.html'; return; }

        const freshUser = await res.json();
        const profile   = freshUser.landlord_profile;

        if (!profile || !profile.is_verified) {
            // Redirect to pending page with explanation
            window.location.href = 'landlord-pending.html';
            return;
        }
    } catch {
        showError('Could not verify your account. Please try again.');
        return;
    }

    // Detect edit mode from URL ?id= param
    const urlParams = new URLSearchParams(window.location.search);
    const editIdStr = urlParams.get('id');
    if (editIdStr && !isNaN(parseInt(editIdStr, 10))) {
        editMode = true;
        editPropertyId = parseInt(editIdStr, 10);
        createdPropertyId = editPropertyId;
    }

    // Pre-fill WhatsApp from profile (only in create mode)
    if (!editMode) {
        const wa = user?.phone_number || '';
        if (wa) document.getElementById('whatsapp_number').value = wa;
    }

    buildStepDots();
    updateProgress();

    try {
        await Promise.all([loadAreas(), loadAmenities()]);
    } catch {
        showError('Failed to load form data. Please refresh.');
    }

    // Pre-fill form if editing an existing listing
    if (editMode) {
        await loadPropertyForEdit(editPropertyId);
    }

    // Listing type toggle (rent vs sale)
    window.toggleListingType = (val) => {
        const label = document.getElementById('rent_amount_label');
        if (label) label.textContent = val === 'sale' ? 'Sale Price (KES) *' : 'Monthly Rent (KES) *';
    };

    // Live description counter
    const descEl = document.getElementById('description');
    if (descEl) {
        descEl.addEventListener('input', () => {
            document.getElementById('desc-count').textContent =
                `${descEl.value.length} / 50 min characters`;
        });
    }
}

// ── API data ──────────────────────────────────────────────
const KILIFI_AREA_NAMES = [
    'Bofa','Charo wa Mae','Kaya','Kibaoni','Kisumu Ndogo',
    'Kiwandani','Kwa Mwango','Mabirikani','Makao','Marembo',
    'Misufini','Mnarani','Mtaani','Zimbabwe',
];

async function loadAreas() {
    const sel = document.getElementById('location_area');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select area…</option>';
    try {
        const res  = await fetch(`${API}/properties/areas/`);
        const data = await res.json();
        areasData = data.results || data;
        if (areasData.length) {
            areasData.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id; opt.textContent = a.name;
                sel.appendChild(opt);
            });
            return;
        }
    } catch {}
    // Fallback when API returns empty (database not yet seeded)
    KILIFI_AREA_NAMES.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        sel.appendChild(opt);
    });
}

const FALLBACK_AMENITIES = [
    { id: 'wifi', name: 'wifi' }, { id: 'parking', name: 'parking' },
    { id: 'water', name: 'water' }, { id: 'security', name: 'security' },
    { id: 'electricity', name: 'electricity' }, { id: 'balcony', name: 'balcony' },
    { id: 'furnished', name: 'furnished' }, { id: 'kitchen', name: 'kitchen' },
    { id: 'laundry', name: 'laundry' }, { id: 'study_space', name: 'study_space' },
];

async function loadAmenities() {
    try {
        const res = await fetch(`${API}/properties/amenities/`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const fetched = data.results || data;
        if (fetched.length) {
            amenitiesData = fetched;
        } else {
            amenitiesData = FALLBACK_AMENITIES;
        }
    } catch {
        amenitiesData = FALLBACK_AMENITIES;
    }

    const grid = document.getElementById('amenity-grid');
    grid.innerHTML = '';
    amenitiesData.forEach(a => {
        const icon = AMENITY_ICONS[a.name] || '✅';
        grid.insertAdjacentHTML('beforeend', `
            <div class="amenity-item">
                <input type="checkbox" id="am_${a.id}" value="${a.id}" onchange="toggleAmenity('${a.id}', this.checked)">
                <label for="am_${a.id}" class="amenity-label">
                    <span class="amenity-icon">${icon}</span>
                    <span class="amenity-name">${a.name.replace(/_/g, ' ')}</span>
                </label>
            </div>`);
    });
}

window.toggleAmenity = (id, checked) => {
    if (checked) selectedAmenities.push(id);
    else selectedAmenities = selectedAmenities.filter(x => x !== id);
};

// ── Map (Leaflet) ─────────────────────────────────────────
// Kilifi Town Center coordinates
const PWANI = [-3.6305, 39.8499];

function initMap() {
    if (map) return; // already initialised

    map = L.map('property-map').setView(PWANI, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);

    // Kilifi Town Center reference marker
    L.marker(PWANI, {
        icon: L.divIcon({
            className: '',
            html: '<div style="background:#1A2B4A;color:#fff;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;">Kilifi Town</div>',
            iconAnchor: [50, 0],
        }),
    }).addTo(map);

    // Click to place pin
    map.on('click', e => placePin(e.latlng.lat, e.latlng.lng));
}

function placePin(lat, lng) {
    if (marker) marker.remove();

    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on('dragend', e => {
        const pos = e.target.getLatLng();
        saveCoords(pos.lat, pos.lng);
        reverseGeocode(pos.lat, pos.lng);
    });

    saveCoords(lat, lng);
    reverseGeocode(lat, lng);
}

function saveCoords(lat, lng) {
    document.getElementById('latitude').value  = lat.toFixed(6);
    document.getElementById('longitude').value = lng.toFixed(6);
}

async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const label = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        document.getElementById('map-location-text').textContent = label;
        document.getElementById('map-location-display').classList.add('show');
    } catch {
        document.getElementById('map-location-text').textContent =
            `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        document.getElementById('map-location-display').classList.add('show');
    }
}

window.useMyLocation = () => {
    if (!navigator.geolocation) {
        showError('Your browser does not support GPS location.');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude: lat, longitude: lng } = pos.coords;
            map.setView([lat, lng], 17);
            placePin(lat, lng);
        },
        () => showError('Could not get your location. Please pin manually on the map.'),
        { timeout: 10000 }
    );
};

// ── Photo handling ────────────────────────────────────────
window.handlePhotos = (category, slot, input) => {
    if (!uploadedPhotos[category]) uploadedPhotos[category] = {};
    uploadedPhotos[category][slot] = Array.from(input.files);
    renderPhotoPreviews(category, slot);
};

function renderPhotoPreviews(category, slot) {
    const files  = uploadedPhotos[category][slot] || [];
    const grid   = document.getElementById(`preview-${category}_${slot}`);
    if (!grid) return;
    grid.innerHTML = '';
    files.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = e => {
            const div = document.createElement('div');
            div.className = 'photo-preview';
            div.innerHTML = `<img src="${e.target.result}" alt="Preview">
                <button class="photo-remove" onclick="removePhoto('${category}','${slot}',${i})">✕</button>`;
            grid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

window.removePhoto = (category, slot, index) => {
    uploadedPhotos[category][slot].splice(index, 1);
    renderPhotoPreviews(category, slot);
};
window.triggerUpload = id => document.getElementById(id)?.click();

// ── Video handling ────────────────────────────────────────
window.handleVideo = (slot, input) => {
    if (!input.files.length) return;
    uploadedVideos[slot] = input.files[0];
    const el = document.getElementById(`preview-video_${slot}`);
    if (el) el.innerHTML = `
        <div class="video-preview">
            <span style="font-size:var(--font-size-sm);">🎬 ${input.files[0].name}</span>
            <button class="btn btn-sm btn-danger" onclick="removeVideo('${slot}')">Remove</button>
        </div>`;
};

window.removeVideo = slot => {
    delete uploadedVideos[slot];
    const el = document.getElementById(`preview-video_${slot}`);
    if (el) el.innerHTML = '';
    const input = document.getElementById(`video_${slot}`);
    if (input) input.value = '';
};

// ── Progress ──────────────────────────────────────────────
function buildStepDots() {
    const container = document.getElementById('step-dots');
    container.innerHTML = '';
    for (let i = 1; i <= TOTAL; i++) {
        const div = document.createElement('div');
        div.className = 'step-dot'; div.id = `dot-${i}`; div.textContent = i;
        container.appendChild(div);
    }
}

function updateProgress() {
    const pct = Math.round((currentStep / TOTAL) * 100);
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-title').textContent = `Step ${currentStep} of ${TOTAL}`;
    document.getElementById('progress-subtitle').textContent = STEP_TITLES[currentStep - 1];

    for (let i = 1; i <= TOTAL; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (!dot) continue;
        dot.className = 'step-dot';
        if (i < currentStep)      dot.classList.add('completed');
        else if (i === currentStep) dot.classList.add('active');
    }

    document.getElementById('prev-btn').style.display   = currentStep > 1 && currentStep < 9 ? 'inline-flex' : 'none';
    document.getElementById('next-btn').style.display   = currentStep < 8  ? 'inline-flex' : 'none';
    document.getElementById('pay-btn').style.display    = 'none';
    document.getElementById('submit-btn').style.display = currentStep === 8 ? 'inline-flex' : 'none';

    // Initialise Leaflet when Step 7 becomes visible
    if (currentStep === 7) {
        setTimeout(initMap, 50);
    }
}

// ── Navigation ────────────────────────────────────────────
window.goToNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === 7) buildPreview();
    if (currentStep < TOTAL) showStep(currentStep + 1);
};

window.goToPrev = () => { if (currentStep > 1) showStep(currentStep - 1); };

function showStep(n) {
    // Deactivate old step (map logical → HTML: success is step-10 HTML)
    const oldHtml = currentStep === 9 ? 10 : currentStep;
    document.getElementById(`step-${oldHtml}`)?.classList.remove('active');
    currentStep = n;
    // step 9 = Submitted; its HTML is step-10 (step-9 HTML is the old payment form)
    const newHtml = currentStep === 9 ? 10 : currentStep;
    document.getElementById(`step-${newHtml}`)?.classList.add('active');
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Validation ────────────────────────────────────────────
function validateStep(step) {
    clearErrors();
    const errs = [];

    if (step === 1) {
        const title   = document.getElementById('title').value.trim();
        const desc    = document.getElementById('description').value.trim();
        const rent    = document.getElementById('rent_amount').value;
        const deposit = document.getElementById('security_deposit').value;
        const type    = document.getElementById('property_type').value;
        const area    = document.getElementById('location_area').value;
        const wa      = document.getElementById('whatsapp_number').value.trim();

        if (!title || title.length < 5)               errs.push(['title', 'Title must be at least 5 characters']);
        if (!desc  || desc.length  < 50)               errs.push(['description', `Description must be at least 50 characters (${desc.length} so far)`]);
        if (!rent  || parseFloat(rent) < 500)          errs.push(['rent_amount', 'Rent must be at least KES 500']);
        if (deposit === '' || parseFloat(deposit) < 0) errs.push(['security_deposit', 'Security deposit is required']);
        if (!type)                                     errs.push(['property_type', 'Please select a room type']);
        if (!area)                                     errs.push(['location_area', 'Please select an area']);
        if (!wa)                                       errs.push(['whatsapp_number', 'WhatsApp number is required']);
    }

    if (step === 2 && selectedAmenities.length === 0) {
        errs.push(['amenities', 'Please select at least one amenity']);
    }

    // Photos are optional — landlords can add them later via edit

    if (errs.length) {
        errs.forEach(([field, msg]) => {
            const el = document.getElementById(`err-${field}`);
            if (el) el.textContent = msg;
        });
        document.querySelector('.form-error:not(:empty)')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }
    return true;
}

function clearErrors() {
    document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
}

// ── Preview ───────────────────────────────────────────────
function buildPreview() {
    const title   = document.getElementById('title').value;
    const rent    = document.getElementById('rent_amount').value;
    const deposit = document.getElementById('security_deposit').value;
    const type    = document.getElementById('property_type');
    const area    = document.getElementById('location_area');

    document.getElementById('preview-title').textContent   = title || 'Untitled Property';
    document.getElementById('preview-rent').textContent    = `KES ${parseInt(rent||0).toLocaleString()} / month`;
    document.getElementById('preview-deposit').textContent = parseInt(deposit||0).toLocaleString();
    document.getElementById('preview-type').textContent    = type.options[type.selectedIndex]?.text || '';
    document.getElementById('preview-area').textContent    = area.options[area.selectedIndex]?.text || '';

    const roomPhotos = Object.values(uploadedPhotos.room || {}).flat();
    const imgEl = document.getElementById('preview-main-img');
    const noImg = document.getElementById('preview-no-img');
    if (roomPhotos.length) {
        const reader = new FileReader();
        reader.onload = e => { imgEl.src = e.target.result; imgEl.style.display = 'block'; noImg.style.display = 'none'; };
        reader.readAsDataURL(roomPhotos[0]);
    } else {
        imgEl.style.display = 'none'; noImg.style.display = 'flex';
    }

    const amenityContainer = document.getElementById('preview-amenities');
    const selectedSet = new Set(selectedAmenities.map(String));
    const selectedData = amenitiesData.filter(a => selectedSet.has(String(a.id)));
    amenityContainer.innerHTML = selectedData.map(a =>
        `<span class="preview-amenity">${AMENITY_ICONS[a.name]||'✅'} ${a.name.replace(/_/g,' ')}</span>`
    ).join('');
}

// ── Payment ───────────────────────────────────────────────
window.initiatePayment = async () => {
    const phone = document.getElementById('mpesa_phone').value.trim();
    if (!phone) {
        document.getElementById('err-mpesa_phone').textContent = 'Please enter your M-Pesa number';
        return;
    }

    const btn = document.getElementById('pay-btn');
    btn.disabled = true;
    btn.textContent = 'Sending M-Pesa prompt…';

    try {
        // Create property draft first (if not yet created)
        if (!createdPropertyId) {
            createdPropertyId = await createPropertyDraft();
            if (!createdPropertyId) {
                btn.disabled = false;
                btn.textContent = '💳 Pay KES 300 via M-Pesa';
                return;
            }
        }

        // Initiate STK push via correct endpoint
        const token = getLocalStorage('access_token');
        const res = await fetch(`${API}/payments/initiate_mpesa/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                phone_number: phone,
                amount: 300,
                payment_type: 'listing_fee',
                property_id: createdPropertyId,
            }),
        });

        const result = await res.json();

        if (res.ok) {
            paymentId = result.payment_id;
            showSuccess('M-Pesa prompt sent! Enter your PIN on your phone within 30 seconds.');
            btn.textContent = '⏳ Waiting for payment…';
            // Start polling for payment confirmation
            startPaymentPolling();
        } else {
            // Dev fallback — allow submitting without real payment (sandbox / no Safaricom creds)
            const errMsg = result.error || 'M-Pesa unavailable in development mode.';
            showError(errMsg + ' You can still submit for review.');
            btn.style.display = 'none';
            document.getElementById('submit-btn').style.display = 'inline-flex';
        }
    } catch {
        showError('Payment initiation failed. Please try again.');
        btn.disabled = false;
        btn.textContent = '💳 Pay KES 300 via M-Pesa';
    }
};

function startPaymentPolling() {
    if (!paymentId) return;
    let attempts = 0;
    const MAX_ATTEMPTS = 24; // 2 minutes at 5s intervals

    paymentPolling = setInterval(async () => {
        attempts++;
        try {
            const token = getLocalStorage('access_token');
            const res = await fetch(`${API}/payments/status/${paymentId}/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.status === 'completed') {
                clearInterval(paymentPolling);
                showSuccess('Payment confirmed! Click Submit to publish your listing.');
                document.getElementById('pay-btn').style.display = 'none';
                document.getElementById('submit-btn').style.display = 'inline-flex';
            } else if (data.status === 'failed') {
                clearInterval(paymentPolling);
                showError('Payment was cancelled or failed. Please try again.');
                const btn = document.getElementById('pay-btn');
                btn.disabled = false;
                btn.textContent = '💳 Pay KES 300 via M-Pesa';
            } else if (attempts >= MAX_ATTEMPTS) {
                clearInterval(paymentPolling);
                showError('Payment timeout. If you paid, contact support. Otherwise try again.');
                const btn = document.getElementById('pay-btn');
                btn.disabled = false;
                btn.textContent = '💳 Retry Payment';
            }
        } catch {
            // Network glitch — keep polling
        }
    }, 5000);
}

window.submitListing = async () => {
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = editMode ? 'Updating…' : 'Submitting…';

    try {
        if (editMode) {
            const ok = await updatePropertyDraft(createdPropertyId);
            if (!ok) {
                btn.disabled = false;
                btn.textContent = 'Update Listing';
                return;
            }
        } else if (!createdPropertyId) {
            createdPropertyId = await createPropertyDraft();
        }

        if (createdPropertyId) {
            await uploadAllPhotos(createdPropertyId);
            if (editMode) {
                const h2 = document.querySelector('#step-10 .success-card h2');
                const p  = document.querySelector('#step-10 .success-card p');
                if (h2) h2.textContent = 'Listing Updated!';
                if (p)  p.textContent  = 'Your listing has been updated. Changes will be reviewed by HomLink and reflected shortly.';
            }
            showStep(9);
        }
    } catch {
        showError('Submission failed. Please try again.');
        btn.disabled = false;
        btn.textContent = editMode ? 'Update Listing' : 'Submit Listing';
    }
};

// ── API calls ─────────────────────────────────────────────
async function createPropertyDraft() {
    try {
        const token = getLocalStorage('access_token');
        const areaRaw    = document.getElementById('location_area').value;
        const areaId     = parseInt(areaRaw, 10);
        const amenityIds = selectedAmenities.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

        const payload = {
            title:            document.getElementById('title').value.trim(),
            description:      document.getElementById('description').value.trim(),
            listing_type:     document.getElementById('listing_type')?.value || 'rent',
            rent_amount:      parseFloat(document.getElementById('rent_amount').value),
            security_deposit: parseFloat(document.getElementById('security_deposit').value || 0),
            property_type:    document.getElementById('property_type').value,
            location_area:    !isNaN(areaId) ? areaId : null,
            estate:           document.getElementById('estate').value.trim(),
            latitude:         document.getElementById('latitude').value  ? parseFloat(document.getElementById('latitude').value)  : null,
            longitude:        document.getElementById('longitude').value ? parseFloat(document.getElementById('longitude').value) : null,
            whatsapp_number:  document.getElementById('whatsapp_number').value.trim(),
            is_available:     true,
            amenity_ids:      amenityIds,
        };

        const res = await fetch(`${API}/properties/properties/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json();
            showError('Could not save listing: ' + (err.detail || JSON.stringify(err)));
            return null;
        }

        const data = await res.json();
        return data.id;
    } catch (err) {
        showError('Error saving listing: ' + err.message);
        return null;
    }
}

async function uploadAllPhotos(propertyId) {
    const token = getLocalStorage('access_token');
    const catMap = { room: 'ROOM', compound: 'COMPOUND', building: 'BUILDING' };

    for (const [cat, slots] of Object.entries(uploadedPhotos)) {
        for (const [, files] of Object.entries(slots)) {
            if (!files.length) continue;
            const fd = new FormData();
            files.forEach(f => fd.append('images', f));
            fd.append('category', catMap[cat] || 'ROOM');

            try {
                const res = await fetch(`${API}/properties/properties/${propertyId}/upload_images/`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd,
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    console.error(`Image upload failed [${res.status}]:`, errData);
                    showError(`Photo upload failed (${res.status}): ${errData.error || 'Unknown error'}. Check console.`);
                }
            } catch (err) {
                console.error('Photo upload network error:', err);
            }
        }
    }
}

// ── Edit mode helpers ─────────────────────────────────────
async function loadPropertyForEdit(id) {
    try {
        const token = getLocalStorage('access_token');
        const res = await fetch(`${API}/properties/properties/my_listings/`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            showError('Could not load your listing data.');
            return;
        }
        const listings = await res.json();
        const prop = listings.find(p => p.id === id);
        if (!prop) {
            showError('Listing not found. You can still edit the form and a new listing will be created.');
            editMode = false;
            editPropertyId = null;
            createdPropertyId = null;
            return;
        }
        prefillForm(prop);
    } catch (err) {
        showError('Failed to load listing: ' + err.message);
    }
}

function prefillForm(prop) {
    const set = (elId, val) => {
        const el = document.getElementById(elId);
        if (el && val !== null && val !== undefined) el.value = val;
    };

    set('title',            prop.title);
    set('description',      prop.description);
    set('listing_type',     prop.listing_type);
    set('rent_amount',      prop.rent_amount);
    set('security_deposit', prop.security_deposit);
    set('property_type',    prop.property_type);
    set('location_area',    prop.location_area?.id);
    set('estate',           prop.estate);
    set('whatsapp_number',  prop.whatsapp_number);
    if (prop.latitude)  set('latitude',  prop.latitude);
    if (prop.longitude) set('longitude', prop.longitude);

    // Refresh description counter
    const descEl    = document.getElementById('description');
    const descCount = document.getElementById('desc-count');
    if (descEl && descCount) descCount.textContent = `${descEl.value.length} / 50 min characters`;

    // Update rent/sale label
    if (prop.listing_type === 'sale') {
        const label = document.getElementById('rent_amount_label');
        if (label) label.textContent = 'Sale Price (KES) *';
    }

    // Pre-select amenities
    selectedAmenities = [];
    (prop.amenities || []).forEach(a => {
        const cb = document.getElementById(`am_${a.id}`);
        if (cb) { cb.checked = true; selectedAmenities.push(a.id); }
    });

    // Update submit button text
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) submitBtn.textContent = 'Update Listing';

    // Show existing images above upload zones
    if (prop.images && prop.images.length) showExistingImages(prop.images);
}

function showExistingImages(images) {
    const byCategory = { ROOM: [], COMPOUND: [], BUILDING: [] };
    images.forEach(img => { const c = img.category || 'ROOM'; if (byCategory[c]) byCategory[c].push(img); });

    const stepMap = { ROOM: 'step-3', COMPOUND: 'step-4', BUILDING: 'step-5' };

    Object.entries(byCategory).forEach(([cat, imgs]) => {
        if (!imgs.length) return;
        const stepEl = document.getElementById(stepMap[cat]);
        if (!stepEl) return;
        const header = stepEl.querySelector('.step-card-header');
        if (!header) return;

        const notice = document.createElement('div');
        notice.style.cssText = 'background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;margin-bottom:16px;';
        notice.innerHTML =
            `<p style="font-size:.85em;font-weight:600;color:#0369a1;margin-bottom:8px;">Existing photos (${imgs.length}):</p>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${imgs.map(img => `<img src="${img.image}" style="width:64px;height:64px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;" alt="photo">`).join('')}
            </div>
            <p style="font-size:.8em;color:#0369a1;margin-top:8px;">Upload more photos below to add to these, or skip to keep existing photos.</p>`;

        header.insertAdjacentElement('afterend', notice);
    });
}

async function updatePropertyDraft(id) {
    try {
        const token = getLocalStorage('access_token');
        const areaRaw    = document.getElementById('location_area').value;
        const areaId     = parseInt(areaRaw, 10);
        const amenityIds = selectedAmenities.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

        const payload = {
            title:            document.getElementById('title').value.trim(),
            description:      document.getElementById('description').value.trim(),
            listing_type:     document.getElementById('listing_type')?.value || 'rent',
            rent_amount:      parseFloat(document.getElementById('rent_amount').value),
            security_deposit: parseFloat(document.getElementById('security_deposit').value || 0),
            property_type:    document.getElementById('property_type').value,
            location_area:    !isNaN(areaId) ? areaId : null,
            estate:           document.getElementById('estate').value.trim(),
            latitude:         document.getElementById('latitude').value  ? parseFloat(document.getElementById('latitude').value)  : null,
            longitude:        document.getElementById('longitude').value ? parseFloat(document.getElementById('longitude').value) : null,
            whatsapp_number:  document.getElementById('whatsapp_number').value.trim(),
            is_available:     true,
            amenity_ids:      amenityIds,
        };

        const res = await fetch(`${API}/properties/properties/${id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json();
            showError('Could not update listing: ' + (err.detail || JSON.stringify(err)));
            return false;
        }
        return true;
    } catch (err) {
        showError('Error updating listing: ' + err.message);
        return false;
    }
}

// ── Mount ─────────────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
