import { renderNavbar, formatCurrency, formatDateShort, getQueryParam, showSuccess, showError } from './utils.js';
import { getProperty, createInquiry, addFavorite, removeFavorite, incrementPropertyViews } from './api.js';
import { getCurrentUser, isLoggedIn } from './auth.js';

let currentProperty = null;
let currentImageIndex = 0;
let isFavorited = false;

/**
 * Initialize property detail page
 */
async function init() {
    try {
        // Render navbar
        const user = getCurrentUser();
        renderNavbar(user);

        // Get property ID from URL
        const propertyId = getQueryParam('id');
        if (!propertyId) {
            showError('Property not found');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }

        // Load property
        await loadProperty(propertyId);

        // Increment views
        try {
            await incrementPropertyViews(propertyId);
        } catch (error) {
            console.error('Error incrementing views:', error);
        }

        // Setup event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Init error:', error);
        showError('Failed to load property');
    }
}

/**
 * Load and display property
 */
async function loadProperty(propertyId) {
    try {
        currentProperty = await getProperty(propertyId);

        // Show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('property-content').style.display = 'block';

        // Render property
        renderProperty();

        // Update page title
        document.title = `${currentProperty.title} - HomLink`;
    } catch (error) {
        console.error('Error loading property:', error);
        showError('Property not found or has been removed');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
}

/**
 * Render property details
 */
function renderProperty() {
    if (!currentProperty) return;

    // Title and basic info
    document.getElementById('property-title').textContent = currentProperty.title;
    document.getElementById('property-type').textContent = capitalizePropertyType(currentProperty.property_type);
    const areaName = currentProperty.location_area?.name || currentProperty.town_name || currentProperty.county_name || 'Kilifi';
    document.getElementById('property-location').textContent = `📍 ${areaName}`;
    document.getElementById('property-price').innerHTML = `KES ${parseInt(currentProperty.rent_amount || 0).toLocaleString()} <small>/month</small>`;
    document.getElementById('sidebar-price').textContent = `KES ${parseInt(currentProperty.rent_amount || 0).toLocaleString()}`;
    document.getElementById('property-description').textContent = currentProperty.description;

    // Show verified badge if applicable
    const verifiedBadge = document.getElementById('verified-badge');
    if (currentProperty.is_verified) {
        verifiedBadge.style.display = 'inline-block';
    }

    // Details
    const detailsHtml = `
        <div class="detail-card">
            <div class="detail-label">Security Deposit</div>
            <div class="detail-value">${formatCurrency(currentProperty.security_deposit)}</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Bedrooms</div>
            <div class="detail-value">${getBedroomCount(currentProperty.property_type)}</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Status</div>
            <div class="detail-value">${currentProperty.is_available ? '✅ Available' : '❌ Occupied'}</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Estate</div>
            <div class="detail-value">${currentProperty.estate || 'N/A'}</div>
        </div>
    `;
    document.getElementById('property-details').innerHTML = detailsHtml;

    // Amenities
    const amenitiesHtml = (currentProperty.amenities || []).map(amenity => `
        <div class="amenity-tag">
            <span class="amenity-icon">${getAmenityIcon(amenity.name)}</span>
            <span>${amenity.name}</span>
        </div>
    `).join('');
    document.getElementById('amenities').innerHTML = amenitiesHtml;

    // Landlord Info
    const landlord = currentProperty.landlord;
    const landlordFirstLetter = landlord?.first_name?.[0]?.toUpperCase() || 'L';
    const landlordHtml = `
        <div class="landlord-avatar">${landlordFirstLetter}</div>
        <div class="landlord-name">${landlord?.first_name || 'Landlord'} ${landlord?.last_name || ''}</div>
        <div class="landlord-role">Landlord</div>
        ${landlord?.bio ? `<p style="font-size: var(--font-size-sm); margin-top: var(--spacing-md); color: var(--color-text-muted);">${landlord.bio}</p>` : ''}
    `;
    document.getElementById('landlord-info').innerHTML = landlordHtml;

    // WhatsApp button — always contacts HomLink team, not landlord directly
    const waMessage = `Hi HomLink Team, I am interested in the property: "${currentProperty.title}" (ID: ${currentProperty.id}). Please get in touch with me.`;
    const waLink = `https://wa.me/254757734299?text=${encodeURIComponent(waMessage)}`;
    document.getElementById('whatsapp-btn').href = waLink;

    // Mobile bottom bar
    const mobPrice = document.getElementById('mob-price');
    const mobWa    = document.getElementById('mob-whatsapp');
    if (mobPrice) mobPrice.textContent = `KES ${parseInt(currentProperty.rent_amount || 0).toLocaleString()}`;
    if (mobWa)    mobWa.href = waLink;

    // Status
    document.getElementById('property-status').textContent = currentProperty.is_available ? 'Available' : 'Occupied';
    document.getElementById('property-views').textContent = currentProperty.views_count || 0;
    document.getElementById('property-posted').textContent = formatDateShort(currentProperty.created_at);

    // Gallery
    renderGallery();

    // Map - Leaflet.js
    if (currentProperty.latitude && currentProperty.longitude) {
        initializeMap();
    } else {
        document.getElementById('distance-info').innerHTML = '<p style="margin: 0; color: #7c2d12;">⚠️ Location coordinates not available</p>';
        document.getElementById('distance-info').style.display = 'block';
        document.getElementById('distance-info').style.background = '#fef3c7';
        document.getElementById('distance-info').style.borderLeftColor = '#f59e0b';
    }

    // Favorite button state
    const user = getCurrentUser();
    isFavorited = currentProperty.is_favorited || false;
    updateFavoriteButton();

    // Reviews
    renderReviews();
}

/**
 * Render image gallery
 */
function renderGallery() {
    const images = currentProperty.images || [];
    const primaryImage = currentProperty.primary_image;

    if (!images.length) {
        // No photos — show placeholder
        const wrap = document.getElementById('main-img-wrap');
        wrap.innerHTML = `
            <div class="no-image-placeholder">
                <span>🏠</span>
                <span>No photos uploaded yet</span>
            </div>`;
        document.getElementById('thumbnails').style.display = 'none';
        return;
    }

    // Set main image to primary if available
    if (primaryImage) {
        currentImageIndex = images.findIndex(img => img.id === primaryImage.id);
        if (currentImageIndex === -1) currentImageIndex = 0;
    }

    updateMainImage();

    // Render thumbnails (only if more than 1 image)
    if (images.length > 1) {
        const thumbnailsHtml = images.map((img, idx) => `
            <div class="thumbnail ${idx === currentImageIndex ? 'active' : ''}" onclick="setImageIndex(${idx})">
                <img src="${img.image}" alt="Property image ${idx + 1}">
            </div>
        `).join('');
        document.getElementById('thumbnails').innerHTML = thumbnailsHtml;
    } else {
        document.getElementById('thumbnails').style.display = 'none';
    }

    // Show counter only when multiple images
    const counter = document.getElementById('gallery-counter');
    if (images.length > 1) {
        counter.style.display = 'block';
        counter.textContent = `1 / ${images.length}`;
    }
}

/**
 * Render reviews
 */
function renderReviews() {
    const reviews = currentProperty.reviews || [];
    const approvedReviews = reviews.filter(r => r.is_approved);

    let html = '';

    if (approvedReviews.length === 0) {
        html = '<p style="font-size:14px;color:#9ca3af;">No reviews yet.</p>';
    } else {
        html = approvedReviews.map(review => `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-author">${review.tenant?.first_name || 'Anonymous'}</span>
                    <span>${'⭐'.repeat(review.rating)}</span>
                </div>
                <p class="review-body">${review.comment}</p>
                <p class="review-date">${formatDateShort(review.created_at)}</p>
            </div>
        `).join('');
    }

    document.getElementById('reviews-section').innerHTML = html;
}

/**
 * Update main image
 */
function updateMainImage() {
    const images = currentProperty.images || [];
    if (!images.length) return;

    const image = images[currentImageIndex];
    document.getElementById('main-image').src = image.image;

    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach((thumb, idx) => {
        thumb.classList.toggle('active', idx === currentImageIndex);
    });

    // Update counter
    const counter = document.getElementById('gallery-counter');
    if (counter) counter.textContent = `${currentImageIndex + 1} / ${images.length}`;
}

/**
 * Set image index
 */
window.setImageIndex = (idx) => {
    currentImageIndex = idx;
    updateMainImage();
};

/**
 * Next image
 */
window.nextImage = () => {
    const images = currentProperty.images || [];
    currentImageIndex = (currentImageIndex + 1) % (images.length || 1);
    updateMainImage();
};

/**
 * Previous image
 */
window.prevImage = () => {
    const images = currentProperty.images || [];
    currentImageIndex = (currentImageIndex - 1 + (images.length || 1)) % (images.length || 1);
    updateMainImage();
};

/**
 * Toggle favorite
 */
window.toggleFavorite = async () => {
    const user = getCurrentUser();

    if (!user) {
        showError('Please login to save properties');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    try {
        if (isFavorited) {
            // Remove favorite
            await removeFavorite(currentProperty.id);
            isFavorited = false;
            showSuccess('Removed from favorites');
        } else {
            // Add favorite
            await addFavorite(currentProperty.id);
            isFavorited = true;
            showSuccess('Added to favorites');
        }

        updateFavoriteButton();
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showError('Failed to update favorite');
    }
};

/**
 * Update favorite button display
 */
function updateFavoriteButton() {
    const btn = document.getElementById('favorite-btn');
    if (isFavorited) {
        btn.classList.add('favorited');
        btn.textContent = '❤️';
    } else {
        btn.classList.remove('favorited');
        btn.textContent = '🤍';
    }
}

/**
 * Open inquiry modal
 */
window.openInquiryModal = () => {
    const user = getCurrentUser();

    if (!user) {
        showError('Please login to send an inquiry');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    // Pre-fill with user data
    document.getElementById('tenant-name').value = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    document.getElementById('tenant-email').value = user.email || '';
    document.getElementById('tenant-phone').value = user.phone_number || '';

    document.getElementById('inquiry-modal').classList.add('active');
};

/**
 * Close inquiry modal
 */
window.closeInquiryModal = () => {
    document.getElementById('inquiry-modal').classList.remove('active');
};

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('inquiry-form').addEventListener('submit', submitInquiry);

    // Close modal on outside click
    document.getElementById('inquiry-modal').addEventListener('click', (e) => {
        if (e.target.id === 'inquiry-modal') {
            closeInquiryModal();
        }
    });
}

/**
 * Submit inquiry
 */
async function submitInquiry(e) {
    e.preventDefault();

    try {
        const message = document.getElementById('inquiry-message').value;

        await createInquiry(currentProperty.id, message);

        showSuccess('Inquiry sent successfully!');
        closeInquiryModal();
        document.getElementById('inquiry-form').reset();
    } catch (error) {
        console.error('Error submitting inquiry:', error);
        showError('Failed to send inquiry');
    }
}

/**
 * Helper: capitalize property type
 */
function capitalizePropertyType(type) {
    const typeMap = {
        'single_room': 'Single Room',
        'bedsitter': 'Bedsitter',
        'studio': 'Studio',
        '1br': '1 Bedroom',
        '2br': '2 Bedroom',
        '3br': '3 Bedroom',
        'maisonette': 'Maisonette',
        'commercial': 'Commercial'
    };
    return typeMap[type] || type;
}

/**
 * Helper: get bedroom count
 */
function getBedroomCount(type) {
    const map = {
        'single_room': '0',
        'bedsitter': 'Studio',
        'studio': 'Studio',
        '1br': '1',
        '2br': '2',
        '3br': '3',
        'maisonette': '2+',
        'commercial': 'N/A'
    };
    return map[type] || 'N/A';
}

/**
 * Helper: get amenity icon
 */
function getAmenityIcon(amenityName) {
    const iconMap = {
        'wifi': '📶',
        'parking': '🅿️',
        'water': '💧',
        'security': '🔒',
        'electricity': '⚡',
        'balcony': '🌳',
        'furnished': '🛋️'
    };
    return iconMap[amenityName.toLowerCase()] || '✓';
}

/**
 * Helper: Calculate distance between two coordinates using Haversine formula
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimals
}

/**
 * Initialize Leaflet.js map with Kilifi Town landmark
 */
function initializeMap() {
    // Kilifi Town coordinates
    const kilifiLat = -3.6305;
    const kilifiLng = 39.8499;

    // Property coordinates
    const propLat = parseFloat(currentProperty.latitude);
    const propLng = parseFloat(currentProperty.longitude);

    // Create map centered around Kilifi Town
    const map = L.map('property-map').setView([kilifiLat, kilifiLng], 14);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);

    // Add Kilifi Town marker (blue)
    const kilifiMarker = L.circleMarker([kilifiLat, kilifiLng], {
        radius: 10,
        fillColor: '#3b82f6',
        color: '#1e40af',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);

    kilifiMarker.bindPopup('<strong>Kilifi Town</strong><br/>Reference Point');

    // Add property location marker (red)
    const propMarker = L.circleMarker([propLat, propLng], {
        radius: 8,
        fillColor: '#ef4444',
        color: '#991b1b',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);

    propMarker.bindPopup(`<strong>${currentProperty.title}</strong><br/>Rent: KES ${formatCurrency(currentProperty.rent_amount)}`);

    // Draw 1km circle around Kilifi Town
    L.circle([kilifiLat, kilifiLng], {
        radius: 1000, // 1km in meters
        color: '#3b82f6',
        weight: 1,
        opacity: 0.3,
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        dashArray: '5, 5'
    }).addTo(map);

    // Calculate distance
    const distance = haversineDistance(kilifiLat, kilifiLng, propLat, propLng);

    // Rough estimates
    const walkingMinutes = Math.round((distance / 1.4) * 60);
    const bikeMinutes = Math.round((distance / 15) * 60);

    // Display distance info
    const distanceInfo = document.getElementById('distance-info');
    let distanceText = '';

    if (distance < 1) {
        distanceText = `📍 <strong>Town Zone!</strong> Only ${Math.round(distance * 1000)}m from Kilifi Town`;
    } else {
        distanceText = `📍 <strong>${distance.toFixed(2)}km away</strong> - ${walkingMinutes}min walk / ${bikeMinutes}min bike to Kilifi Town`;
    }

    distanceInfo.querySelector('p').innerHTML = distanceText;
    distanceInfo.style.display = 'block';

    // Fit map bounds to show both markers
    const group = new L.featureGroup([kilifiMarker, propMarker]);
    map.fitBounds(group.getBounds().pad(0.1));
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
