# HomLink - Frontend Implementation Guide

This guide shows how to implement the remaining frontend HTML pages for HomLink using the established patterns.

## Overview

We've created the foundation:
- ✅ **CSS Files**: main.css, navbar.css, cards.css, forms.css, dashboard.css
- ✅ **JS Utils**: utils.js (formatting, DOM, modals, notifications)
- ✅ **API Layer**: api.js (all backend calls)
- ✅ **Auth**: auth.js (JWT, token refresh, user state)

Now create the remaining **7 HTML pages + 7 JS files** using these patterns.

## Pattern 1: Simple List Page (Search Results)

**HTML Structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Search Properties - RentConnect</title>
  <link rel="stylesheet" href="css/main.css">
  <link rel="stylesheet" href="css/navbar.css">
  <link rel="stylesheet" href="css/cards.css">
</head>
<body>
  <div id="navbar"></div>
  
  <main class="container">
    <!-- Filters section -->
    <div id="filters"></div>
    
    <!-- Results grid -->
    <div id="properties-grid" class="properties-grid"></div>
    
    <!-- Pagination -->
    <div id="pagination"></div>
  </main>
  
  <script type="module" src="js/search.js"></script>
</body>
</html>
```

**JS Pattern (search.js):**
```javascript
import { renderNavbar, showError } from './utils.js';
import { getProperties, getCounties } from './api.js';
import { getCurrentUser } from './auth.js';

async function init() {
  const user = await initAuth();
  renderNavbar(user);
  
  // Get query params
  const params = getQueryParams();
  
  // Fetch and render
  const properties = await getProperties(params);
  renderProperties(properties);
}

function renderProperties(properties) {
  // Build HTML from template
  // Use formatCurrency, formatDate from utils
  // Add event listeners to buttons
}

document.addEventListener('DOMContentLoaded', init);
```

## Pattern 2: Detail Page with Modal

**For property.html:**
```html
<!-- Get property ID from URL: ?id=123 -->
<div id="property-gallery"></div>
<div id="property-info"></div>

<!-- Modal for inquiry -->
<div id="inquiry-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Send Inquiry</h2>
      <button class="close-btn" onclick="closeModal('inquiry-modal')">✕</button>
    </div>
    <form id="inquiry-form">
      <div class="form-group">
        <textarea name="message" required placeholder="..."></textarea>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Send</button>
    </form>
  </div>
</div>
```

**JS Logic:**
```javascript
async function init() {
  const propertyId = getQueryParam('id');
  const property = await getProperty(propertyId);
  
  renderPropertyGallery(property);
  renderPropertyInfo(property);
  
  setupInquiryForm(propertyId);
}

function setupInquiryForm(propertyId) {
  const form = document.getElementById('inquiry-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = form.message.value;
    await createInquiry(propertyId, message);
    showSuccess('Inquiry sent!');
    closeModal('inquiry-modal');
  });
}
```

## Pattern 3: Form Page (Login/Register)

**HTML:**
```html
<main class="container">
  <div class="form-container">
    <div class="form-header">
      <h1>Login</h1>
      <p>Access your RentConnect account</p>
    </div>
    
    <form id="login-form">
      <div class="form-group">
        <label for="username">Username or Email</label>
        <input type="text" id="username" name="username" required>
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required>
      </div>
      
      <button type="submit" class="btn btn-primary btn-block">Login</button>
    </form>
    
    <p class="text-center mt-lg">
      Don't have an account? <a href="/register.html">Register</a>
    </p>
  </div>
</main>

<script type="module" src="js/login.js"></script>
```

**JS:**
```javascript
import { handleLogin } from './auth.js';
import { showError } from './utils.js';

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const username = document.querySelector('[name="username"]').value;
    const password = document.querySelector('[name="password"]').value;
    await handleLogin(username, password);
  } catch (error) {
    showError('Login failed');
  }
});
```

## Pattern 4: Dashboard (Complex Layout)

**HTML Structure:**
```html
<div class="dashboard-container">
  <!-- Sidebar -->
  <aside class="dashboard-sidebar">
    <ul class="dashboard-menu">
      <li><a href="#" class="dashboard-menu-link active" onclick="switchTab('listings')">My Listings</a></li>
      <li><a href="#" class="dashboard-menu-link" onclick="switchTab('inquiries')">Inquiries</a></li>
      <li><a href="#" class="dashboard-menu-link" onclick="switchTab('payments')">Payments</a></li>
    </ul>
  </aside>
  
  <!-- Main content -->
  <div class="dashboard-content">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <a href="/create-listing.html" class="btn btn-primary">New Listing</a>
    </div>
    
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Active Listings</h3>
        <div class="value" id="stat-listings">0</div>
      </div>
    </div>
    
    <!-- Tabs -->
    <div class="tabs">
      <button class="tab-link active" data-tab="listings">Listings</button>
      <button class="tab-link" data-tab="inquiries">Inquiries</button>
    </div>
    
    <div id="listings" class="tab-content active"></div>
    <div id="inquiries" class="tab-content"></div>
  </div>
</div>
```

**JS:**
```javascript
let currentTab = 'listings';

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
}

async function loadListings() {
  const listings = await getMyListings();
  
  const html = listings.map(listing => `
    <div class="listing-card">
      <img src="${listing.images[0]?.image}" class="listing-image" alt="">
      <div class="listing-details">
        <h3>${listing.title}</h3>
        <p>${listing.county_name} • ${listing.town_name}</p>
      </div>
      <div class="listing-actions">
        <a href="/create-listing.html?id=${listing.id}" class="btn btn-secondary btn-sm">Edit</a>
        <button onclick="deleteListing(${listing.id})" class="btn btn-danger btn-sm">Delete</button>
      </div>
    </div>
  `).join('');
  
  document.getElementById('listings').innerHTML = html;
}
```

## Pattern 5: Multi-step Form (Create Listing)

**HTML:**
```html
<div class="form-container">
  <div class="form-steps">
    <div class="form-step active">
      <div class="form-step-number">1</div>
      <div class="form-step-label">Details</div>
    </div>
    <div class="form-step">
      <div class="form-step-number">2</div>
      <div class="form-step-label">Location</div>
    </div>
    <div class="form-step">
      <div class="form-step-number">3</div>
      <div class="form-step-label">Images</div>
    </div>
    <div class="form-step">
      <div class="form-step-number">4</div>
      <div class="form-step-label">Payment</div>
    </div>
  </div>
  
  <form id="listing-form">
    <!-- Step 1 -->
    <div id="step-1" class="form-step-content">
      <div class="form-group">
        <label>Property Title</label>
        <input type="text" name="title" required>
      </div>
      <!-- More fields -->
      <button type="button" onclick="nextStep()">Next</button>
    </div>
    
    <!-- Step 2, 3, 4... -->
  </form>
</div>
```

**JS:**
```javascript
let currentStep = 1;
let propertyData = {};

function nextStep() {
  if (validateStep(currentStep)) {
    currentStep++;
    showStep(currentStep);
  }
}

async function submitForm() {
  try {
    const property = await createProperty(propertyData);
    
    // Upload images
    await uploadPropertyImages(property.id, imageFiles);
    
    // Initiate payment
    await initiateM2Pesa(phone, 300, 'listing_fee', property.id);
    
    showSuccess('Listing created! Complete payment to go live.');
  } catch (error) {
    showError('Failed to create listing');
  }
}
```

## Common Patterns to Reuse

### 1. Rendering Property Card
```javascript
function createPropertyCard(property) {
  return `
    <div class="property-card" onclick="goToProperty(${property.id})">
      <div class="property-image-container">
        <img src="${property.primary_image?.image}" class="property-image" alt="">
        <div class="property-badges">
          ${property.is_featured ? '<span class="badge badge-featured">Featured</span>' : ''}
        </div>
      </div>
      <div class="property-info">
        <h3 class="property-title">${property.title}</h3>
        <div class="property-rent">
          ${formatCurrency(property.rent_amount)}<span>/month</span>
        </div>
      </div>
    </div>
  `;
}
```

### 2. Error Handling
```javascript
async function safeFetch(apiCall) {
  try {
    return await apiCall();
  } catch (error) {
    const message = handleApiError(error);
    showError(message);
    throw error;
  }
}
```

### 3. Loading State
```javascript
async function loadData(button) {
  startLoading(button);
  try {
    const data = await fetchData();
    renderData(data);
  } finally {
    stopLoading(button);
  }
}
```

## Remaining Pages Checklist

### HTML Pages to Create:
- [ ] index.html (Homepage - featured + hero)
- [ ] search.html (Search results + filters)
- [ ] property.html (Detail page + gallery)
- [ ] login.html (Login form)
- [ ] register.html (Register form + role selection)
- [ ] create-listing.html (Multi-step form)
- [ ] dashboard-landlord.html (My listings, inquiries)
- [ ] dashboard-tenant.html (Favorites, inquiries)
- [ ] dashboard-admin.html (Pending approvals, users)

### JS Files to Create:
- [ ] main.js (index.html)
- [ ] search.js (search.html)
- [ ] property.js (property.html)
- [ ] login.js (login.html)
- [ ] register.js (register.html)
- [ ] create-listing.js (create-listing.html)
- [ ] dashboard-landlord.js
- [ ] dashboard-tenant.js
- [ ] dashboard-admin.js

## Quick Start Template

Use this for each page:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page Title - RentConnect</title>
  <link rel="stylesheet" href="css/main.css">
  <link rel="stylesheet" href="css/navbar.css">
  <!-- Add other CSS files as needed -->
</head>
<body>
  <div id="navbar"></div>
  <main class="container">
    <!-- Your content here -->
  </main>
  <script type="module" src="js/page-name.js"></script>
</body>
</html>
```

## Deployment Checklist

Before deploying:
- [ ] Update API_URL in api.js to production
- [ ] Test all pages on mobile (< 640px)
- [ ] Test all forms with validation
- [ ] Verify images load from Cloudinary
- [ ] Test M-Pesa payment flow
- [ ] Check browser console for errors
- [ ] Validate all links work
- [ ] Test logout functionality

---

**Follow these patterns and your remaining pages will be consistent, maintainable, and professional!**
