# HomLink - Kilifi Student Accommodation
## Frontend Implementation Guide

### Overview
HomLink is now focused exclusively on student accommodation in Kilifi Town, optimized for Pwani University students. This guide covers frontend implementation for all pages.

---

## 📁 Project Structure

```
frontend/
├── index.html                 # Homepage - Hero + Featured listings
├── search.html               # Search with Kilifi filters
├── property.html             # Property detail with gallery, videos, map
├── create-listing.html       # Landlord listing creation
├── dashboard-landlord.html   # Landlord analytics dashboard
├── dashboard-tenant.html     # Tenant saved searches & favorites
├── login.html                # Authentication
├── register.html             # User registration
├── css/
│   ├── main.css             # Base styles & variables
│   ├── navbar.css           # Navigation styles
│   ├── cards.css            # Card components
│   ├── forms.css            # Form styles
│   ├── dashboard.css        # Dashboard styles
│   └── kilifi-student.css   # Student accommodation features (NEW)
└── js/
    ├── api.js               # API wrapper functions
    ├── auth.js              # Authentication logic
    ├── utils.js             # Utility functions
    ├── main.js              # Homepage logic
    ├── search.js            # Search & filtering
    ├── property.js          # Property detail page
    ├── create-listing.js    # Listing creation
    └── dashboard-*.js       # Dashboard scripts
```

---

## 🎨 CSS Features

### New CSS File: `kilifi-student.css`
Includes styles for:
- **Gallery System** - Categorized images (Room, Compound, Building)
- **Video Tours** - 60-second video player and thumbnails
- **Distance Display** - Distance to Pwani University with walking/bike times
- **Badges** - Verified, Featured, Available, Near Campus badges
- **Map Section** - OpenStreetMap integration
- **Hero Section** - "Find accommodation around Pwani University"
- **Amenities Grid** - Filterable amenities display
- **Landlord Profile** - Landlord info with WhatsApp button
- **Search Filters** - Advanced filters including distance slider

Link in HTML:
```html
<link rel="stylesheet" href="css/kilifi-student.css">
```

---

## 🏠 Homepage (index.html) - Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HomLink - Student Accommodation in Kilifi</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/navbar.css">
    <link rel="stylesheet" href="css/cards.css">
    <link rel="stylesheet" href="css/kilifi-student.css">
</head>
<body>
    <!-- Navigation -->
    <nav id="navbar" class="navbar"></nav>

    <!-- Hero Section -->
    <section class="hero-section">
        <h1>Find Verified Student Accommodation Around Pwani University</h1>
        <p>Affordable rooms near campus in Kilifi Town</p>
        <div class="hero-search">
            <input type="text" id="heroSearch" placeholder="Search location or price range..." class="search-input">
            <button class="btn btn-primary" id="heroSearchBtn">Search</button>
        </div>
    </section>

    <!-- Featured Listings -->
    <section class="featured-section">
        <h2>⭐ Featured Listings</h2>
        <div id="featuredListings" class="cards-grid"></div>
    </section>

    <!-- Rooms Near Campus -->
    <section class="near-campus-section">
        <h2>📍 Near Pwani University</h2>
        <p>Properties within 1km of campus</p>
        <div id="nearCampusListings" class="cards-grid"></div>
    </section>

    <!-- Recently Added -->
    <section class="recent-section">
        <h2>✨ Recently Added</h2>
        <div id="recentListings" class="cards-grid"></div>
    </section>

    <!-- Affordable Houses -->
    <section class="affordable-section">
        <h2>💰 Affordable Options</h2>
        <p>Best deals for student accommodation</p>
        <div id="affordableListings" class="cards-grid"></div>
    </section>

    <!-- Verified Properties -->
    <section class="verified-section">
        <h2>✓ Verified Properties</h2>
        <p>Trusted landlords and properties</p>
        <div id="verifiedListings" class="cards-grid"></div>
    </section>

    <footer id="footer" class="footer"></footer>

    <script src="js/api.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/utils.js"></script>
    <script src="js/main.js"></script>
</body>
</html>
```

### Homepage JS (main.js)

```javascript
// Load homepage data
document.addEventListener('DOMContentLoaded', async () => {
    await loadNavbar();
    await loadFeaturedListings();
    await loadNearCampusListings();
    await loadRecentListings();
    await loadAffordableListings();
    await loadVerifiedListings();
    
    // Hero search button
    document.getElementById('heroSearchBtn').addEventListener('click', () => {
        const query = document.getElementById('heroSearch').value;
        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    });
});

// Load featured listings
async function loadFeaturedListings() {
    try {
        const response = await fetch(`${API_URL}/properties/featured/`);
        const properties = await response.json();
        const container = document.getElementById('featuredListings');
        
        container.innerHTML = properties.map(prop => `
            <div class="property-card featured">
                <div class="card-image">
                    ${prop.primary_image ? `<img src="${prop.primary_image.image}" alt="${prop.title}">` : ''}
                    ${prop.is_featured ? '<div class="featured-badge">⭐ Featured</div>' : ''}
                </div>
                <div class="card-body">
                    <h3>${prop.title}</h3>
                    <p class="location">📍 ${prop.location_area_name}</p>
                    <p class="distance">🚶 ${prop.distance_display || 'Distance unavailable'}</p>
                    <div class="badge-group">
                        ${prop.badges.includes('verified') ? '<span class="badge verified">Verified</span>' : ''}
                        ${prop.badges.includes('near_campus') ? '<span class="badge near-campus">Near Campus</span>' : ''}
                    </div>
                    <div class="card-footer">
                        <span class="price">KES ${prop.rent_amount.toLocaleString()}</span>
                        <a href="property.html?id=${prop.id}" class="btn btn-sm">View</a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading featured listings:', error);
    }
}

// Load properties near campus (within 1km)
async function loadNearCampusListings() {
    try {
        const response = await fetch(`${API_URL}/properties/near_campus/`);
        const properties = await response.json();
        const container = document.getElementById('nearCampusListings');
        
        container.innerHTML = properties.map(prop => renderPropertyCard(prop)).join('');
    } catch (error) {
        console.error('Error loading near campus listings:', error);
    }
}

// Similar functions for other sections...
async function loadRecentListings() { ... }
async function loadAffordableListings() { ... }
async function loadVerifiedListings() { ... }

// Helper function to render property card
function renderPropertyCard(prop) {
    return `
        <div class="property-card">
            <div class="card-image">
                ${prop.primary_image ? `<img src="${prop.primary_image.image}" alt="${prop.title}">` : ''}
            </div>
            <div class="card-body">
                <h3>${prop.title}</h3>
                <p class="location">📍 ${prop.location_area_name}</p>
                <p class="distance">🚶 ${prop.distance_display}</p>
                <div class="badge-group">
                    ${prop.badges.map(b => `<span class="badge ${b}">${b.replace('_', ' ').toUpperCase()}</span>`).join('')}
                </div>
                <div class="card-footer">
                    <span class="price">KES ${prop.rent_amount.toLocaleString()}</span>
                    <a href="property.html?id=${prop.id}" class="btn btn-sm">View</a>
                </div>
            </div>
        </div>
    `;
}
```

---

## 🔍 Search Page (search.html)

```html
<!-- Search Filters -->
<div class="search-container">
    <aside class="filters-sidebar">
        <div class="filter-section">
            <!-- Distance Filter -->
            <div class="filter-group">
                <label class="filter-label">Distance from Pwani University</label>
                <div class="distance-slider-container">
                    <input type="range" id="distanceSlider" min="0" max="5" step="0.5" value="5">
                    <div class="slider-labels">
                        <span>0 km</span>
                        <span id="distanceValue">5 km</span>
                    </div>
                </div>
            </div>

            <!-- Property Type Filter -->
            <div class="filter-group">
                <label class="filter-label">Property Type</label>
                <div class="filter-options">
                    <label class="filter-checkbox">
                        <input type="checkbox" name="type" value="single_room"> Single Room
                    </label>
                    <label class="filter-checkbox">
                        <input type="checkbox" name="type" value="bedsitter"> Bedsitter
                    </label>
                    <!-- More types -->
                </div>
            </div>

            <!-- Amenities Filter -->
            <div class="filter-group">
                <label class="filter-label">Amenities</label>
                <div class="filter-options">
                    <label class="filter-checkbox">
                        <input type="checkbox" name="amenity" value="wifi"> WiFi
                    </label>
                    <label class="filter-checkbox">
                        <input type="checkbox" name="amenity" value="water"> Water
                    </label>
                    <label class="filter-checkbox">
                        <input type="checkbox" name="amenity" value="security"> Security
                    </label>
                    <label class="filter-checkbox">
                        <input type="checkbox" name="amenity" value="parking"> Parking
                    </label>
                </div>
            </div>

            <!-- Price Range -->
            <div class="filter-group">
                <label class="filter-label">Price Range</label>
                <div style="display: flex; gap: 10px;">
                    <input type="number" id="minPrice" placeholder="Min" class="form-input">
                    <input type="number" id="maxPrice" placeholder="Max" class="form-input">
                </div>
            </div>

            <!-- Student Specific -->
            <div class="filter-group">
                <label class="filter-label">Student Needs</label>
                <label class="filter-checkbox">
                    <input type="checkbox" name="furnished"> Furnished
                </label>
                <label class="filter-checkbox">
                    <input type="checkbox" name="wifi"> WiFi Available
                </label>
            </div>

            <button id="applyFilters" class="btn btn-primary btn-block">Apply Filters</button>
            <button id="clearFilters" class="btn btn-secondary btn-block">Clear All</button>
        </div>
    </aside>

    <!-- Results -->
    <main class="search-results">
        <div id="searchResults" class="cards-grid"></div>
    </main>
</div>
```

### Search JS (search.js)

```javascript
let filters = {};

document.addEventListener('DOMContentLoaded', async () => {
    await loadNavbar();
    
    // Distance slider
    const distanceSlider = document.getElementById('distanceSlider');
    distanceSlider.addEventListener('input', (e) => {
        document.getElementById('distanceValue').textContent = `${e.target.value} km`;
    });
    
    // Apply filters
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // Initial search
    await performSearch();
});

async function applyFilters() {
    filters = {
        max_distance: document.getElementById('distanceSlider').value,
        property_type: document.querySelector('input[name="type"]:checked')?.value,
        min_rent: document.getElementById('minPrice').value,
        max_rent: document.getElementById('maxPrice').value,
        amenities: Array.from(document.querySelectorAll('input[name="amenity"]:checked'))
            .map(el => el.value)
    };
    
    await performSearch();
}

async function performSearch() {
    try {
        let url = `${API_URL}/properties/?is_available=true`;
        
        if (filters.max_distance) url += `&max_distance=${filters.max_distance}`;
        if (filters.property_type) url += `&property_type=${filters.property_type}`;
        if (filters.min_rent) url += `&min_rent=${filters.min_rent}`;
        if (filters.max_rent) url += `&max_rent=${filters.max_rent}`;
        
        const response = await fetch(url);
        const properties = await response.json();
        
        const container = document.getElementById('searchResults');
        if (properties.length === 0) {
            container.innerHTML = '<p class="no-results">No properties found matching your filters</p>';
            return;
        }
        
        container.innerHTML = properties.map(prop => renderPropertyCard(prop)).join('');
    } catch (error) {
        showNotification('Error searching properties', 'error');
    }
}

function clearFilters() {
    document.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('distanceSlider').value = '5';
    filters = {};
    performSearch();
}
```

---

## 🏘️ Property Detail Page (property.html)

```html
<main class="property-detail">
    <!-- Hero Image -->
    <section class="hero-image">
        <img id="heroImage" src="" alt="Property" class="full-width">
        <div class="badge-group">
            <span id="verifiedBadge" class="badge verified" style="display:none;">✓ Verified</span>
            <span id="featuredBadge" class="badge featured" style="display:none;">⭐ Featured</span>
        </div>
    </section>

    <!-- Distance to Pwani -->
    <section class="distance-info">
        <div class="distance-icon">📍</div>
        <div class="distance-text">
            <h3>Distance to Pwani University</h3>
            <p id="distanceDisplay">Loading...</p>
        </div>
        <div class="distance-badge" id="distanceBadge"></div>
    </section>

    <!-- Gallery Tabs -->
    <section class="gallery-section">
        <div class="gallery-categories">
            <button class="category-tab active" data-category="ROOM">🏠 Rooms</button>
            <button class="category-tab" data-category="COMPOUND">🏢 Compound</button>
            <button class="category-tab" data-category="BUILDING">🏗️ Building</button>
        </div>
        <div class="gallery-grid" id="gallery"></div>
    </section>

    <!-- Video Tours -->
    <section class="video-tour-section">
        <h2>🎥 Video Tour</h2>
        <div id="videoContainer"></div>
    </section>

    <!-- Property Info -->
    <section class="property-info">
        <h2 id="propertyTitle"></h2>
        <p id="propertyDescription"></p>
        
        <!-- Amenities -->
        <div>
            <h3>Amenities</h3>
            <div class="amenities-grid" id="amenities"></div>
        </div>
    </section>

    <!-- Map -->
    <section class="map-section">
        <h2>Location</h2>
        <div id="property-map"></div>
        <div class="map-info">
            <div class="map-info-item">
                <h4>Nearest Landmark</h4>
                <p id="nearestLandmark">Pwani University</p>
            </div>
            <div class="map-info-item">
                <h4>Walking Time</h4>
                <p id="walkingTime">Calculating...</p>
            </div>
            <div class="map-info-item">
                <h4>Boda Boda Time</h4>
                <p id="bodaTime">Calculating...</p>
            </div>
        </div>
    </section>

    <!-- Landlord Profile -->
    <section class="landlord-card">
        <img id="landlordAvatar" src="" alt="Landlord" class="landlord-avatar">
        <div class="landlord-info">
            <h3 id="landlordName"></h3>
            <span id="landlordVerified" class="landlord-badge" style="display:none;">Verified Landlord</span>
            <p id="landlordBio"></p>
            <div class="landlord-stats">
                <div class="stat-item">
                    <div class="stat-value" id="landlordListings">0</div>
                    <div class="stat-label">Listings</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="landlordViews">0</div>
                    <div class="stat-label">Total Views</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="landlordRating">0</div>
                    <div class="stat-label">Rating</div>
                </div>
            </div>
            <div class="landlord-actions">
                <button class="whatsapp-btn" id="whatsappBtn">Contact Landlord</button>
                <button class="btn btn-secondary" id="inquireBtn">Send Inquiry</button>
            </div>
        </div>
    </section>

    <!-- Similar Properties -->
    <section class="similar-properties">
        <h2>Similar Properties</h2>
        <div id="similarProperties" class="cards-grid"></div>
    </section>
</main>
```

### Property Detail JS (property.js)

```javascript
let propertyId;
let propertyData;

document.addEventListener('DOMContentLoaded', async () => {
    await loadNavbar();
    
    const params = new URLSearchParams(window.location.search);
    propertyId = params.get('id');
    
    if (!propertyId) {
        window.location.href = '/';
        return;
    }
    
    await loadPropertyDetail();
    await initializeMap();
    await setupEventListeners();
});

async function loadPropertyDetail() {
    try {
        const response = await fetch(`${API_URL}/properties/${propertyId}/`, {
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`
            }
        });
        propertyData = await response.json();
        
        // Update hero image
        if (propertyData.images.length > 0) {
            document.getElementById('heroImage').src = propertyData.images[0].image;
        }
        
        // Update badges
        if (propertyData.is_verified) {
            document.getElementById('verifiedBadge').style.display = 'inline-flex';
        }
        if (propertyData.is_featured) {
            document.getElementById('featuredBadge').style.display = 'inline-flex';
        }
        
        // Distance info
        document.getElementById('distanceDisplay').textContent = propertyData.distance_display || 'Distance unavailable';
        document.getElementById('distanceBadge').textContent = `${propertyData.distance_to_landmark_km} km`;
        
        // Property info
        document.getElementById('propertyTitle').textContent = propertyData.title;
        document.getElementById('propertyDescription').textContent = propertyData.description;
        
        // Gallery
        loadGallery();
        
        // Videos
        loadVideos();
        
        // Amenities
        loadAmenities();
        
        // Landlord info
        loadLandlordInfo();
        
        // Increment view count
        await fetch(`${API_URL}/properties/${propertyId}/increment_views/`, { method: 'POST' });
        
    } catch (error) {
        console.error('Error loading property:', error);
    }
}

function loadGallery() {
    const container = document.getElementById('gallery');
    const categories = ['ROOM', 'COMPOUND', 'BUILDING'];
    
    // Group images by category
    const imagesByCategory = {};
    categories.forEach(cat => {
        imagesByCategory[cat] = propertyData.images.filter(img => img.category === cat);
    });
    
    // Set active category
    let activeCategory = 'ROOM';
    displayGalleryCategory(activeCategory);
    
    // Category tab listeners
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeCategory = tab.dataset.category;
            displayGalleryCategory(activeCategory);
        });
    });
    
    function displayGalleryCategory(category) {
        container.innerHTML = imagesByCategory[category].map(img => `
            <div class="gallery-item ${img.is_primary ? 'primary' : ''}" onclick="openImageModal('${img.image}')">
                <img src="${img.image}" alt="${category}">
            </div>
        `).join('');
    }
}

function loadVideos() {
    const container = document.getElementById('videoContainer');
    if (propertyData.videos.length === 0) {
        container.innerHTML = '<p>No videos available</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="video-container">
            <video id="mainVideo" controls>
                <source src="${propertyData.videos[0].video}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>
        ${propertyData.videos.length > 1 ? `
            <div class="video-list">
                ${propertyData.videos.map((vid, idx) => `
                    <div class="video-thumbnail" onclick="switchVideo('${vid.video}', ${idx})">
                        <img src="${vid.video}" alt="Video ${idx + 1}" style="height: 80px; object-fit: cover; width: 100%;">
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
}

function switchVideo(videoUrl, index) {
    document.getElementById('mainVideo').src = videoUrl;
}

function loadAmenities() {
    const container = document.getElementById('amenities');
    container.innerHTML = propertyData.amenities.map(amenity => `
        <div class="amenity-item">
            <div class="amenity-icon">✓</div>
            <span>${amenity.get_name_display}</span>
        </div>
    `).join('');
}

function loadLandlordInfo() {
    const landlord = propertyData.landlord;
    document.getElementById('landlordName').textContent = landlord.name;
    document.getElementById('landlordAvatar').src = landlord.profile_photo || 'https://via.placeholder.com/80';
    document.getElementById('landlordBio').textContent = landlord.bio || 'Professional landlord';
    
    if (landlord.is_verified) {
        document.getElementById('landlordVerified').style.display = 'inline-flex';
    }
    
    document.getElementById('landlordListings').textContent = landlord.total_listings || 0;
    document.getElementById('landlordViews').textContent = landlord.total_views || 0;
    document.getElementById('landlordRating').textContent = landlord.average_rating || '0';
}

function setupEventListeners() {
    document.getElementById('whatsappBtn').addEventListener('click', () => {
        const whatsapp = propertyData.landlord.whatsapp_number;
        if (whatsapp) {
            window.open(`https://wa.me/${whatsapp}`, '_blank');
        } else {
            showNotification('WhatsApp number not available', 'error');
        }
    });
    
    document.getElementById('inquireBtn').addEventListener('click', () => {
        // Open inquiry modal or redirect to inquiry page
        showInquiryModal();
    });
}

async function initializeMap() {
    // Initialize Leaflet map
    const map = L.map('property-map').setView([propertyData.latitude, propertyData.longitude], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add property marker
    L.marker([propertyData.latitude, propertyData.longitude])
        .bindPopup(propertyData.title)
        .addTo(map);
    
    // Add Pwani University marker
    const pwani = propertyData.primary_landmark;
    L.marker([pwani.latitude, pwani.longitude], { icon: L.icon({ iconUrl: '📍' }) })
        .bindPopup('Pwani University')
        .addTo(map);
}

function openImageModal(imageUrl) {
    // Open full-screen image viewer
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `<img src="${imageUrl}" style="max-width: 90vw; max-height: 90vh;">`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}
```

---

## 📱 Mobile Responsive

All pages include media queries in `kilifi-student.css`:
- **768px and below**: Stack layouts, adjusted font sizes
- **480px and below**: Full-width, single-column grids

---

## 🔐 API Integration

Update `api.js` with new endpoints:

```javascript
// Kilifi-specific endpoints
const API_ENDPOINTS = {
    AREAS: '/properties/areas/',
    LANDMARKS: '/properties/landmarks/',
    PROPERTIES: '/properties/',
    FEATURED: '/properties/featured/',
    NEAR_CAMPUS: '/properties/near_campus/',
    POPULAR: '/properties/popular/',
    RECENTLY_ADDED: '/properties/recently_added/',
    SAVED_SEARCHES: '/properties/saved-searches/',
};

// Distance calculation
async function getDistance(propertyId) {
    const property = await getProperty(propertyId);
    return property.distance_to_landmark_km;
}
```

---

## 📋 Summary

**Homepage**: Featured listings, near campus, recently added, affordable, verified properties
**Search**: Advanced filters by distance, property type, amenities, price, student needs  
**Property Detail**: Full gallery by category, video tours, interactive map, landlord profile
**Maps**: Leaflet with Pwani University and property locations  
**Badges**: Verified, Featured, Available, Near Campus  
**Distance**: Auto-calculated with display format (800m, 5-minute walk, etc.)

All pages are mobile-responsive and optimized for student accommodation in Kilifi.
