/**
 * HomLink - Utility Functions
 * Shared helpers for formatting, DOM manipulation, and notifications
 */

import { getCurrentUser } from './auth.js';

// ==================== CURRENCY FORMATTING ====================

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
}

// ==================== DATE FORMATTING ====================

export function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatDateShort(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-KE', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return Math.floor(seconds) + ' seconds ago';
}

// ==================== TOAST NOTIFICATIONS ====================

export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  if (duration > 0) {
    setTimeout(() => {
      toast.remove();
    }, duration);
  }
  
  return toast;
}

export function showSuccess(message) {
  showToast(message, 'success');
}

export function showError(message) {
  showToast(message, 'error', 5000);
}

export function showInfo(message) {
  showToast(message, 'info');
}

export function showWarning(message) {
  showToast(message, 'warning');
}

// ==================== LOCAL STORAGE ====================

export function setLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('LocalStorage error:', error);
  }
}

export function getLocalStorage(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error('LocalStorage error:', error);
    return defaultValue;
  }
}

export function removeLocalStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('LocalStorage error:', error);
  }
}

// ==================== URL & QUERY PARAMETERS ====================

export function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

export function getQueryParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

export function setQueryParam(key, value) {
  const params = new URLSearchParams(window.location.search);
  params.set(key, value);
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}

export function buildQueryString(params) {
  return new URLSearchParams(params).toString();
}

// ==================== VALIDATION ====================

export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function isValidPhone(phone) {
  const regex = /^(\+?254|0)[17]\d{8}$/;
  return regex.test(phone);
}

export function isValidPhoneKE(phone) {
  // Kenyan phone: +254712345678 or 0712345678
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.match(/^(\+254|0)[17]\d{8}$/);
}

export function validateForm(formElement) {
  const errors = {};
  const formData = new FormData(formElement);
  
  for (let [key, value] of formData) {
    const field = formElement.querySelector(`[name="${key}"]`);
    if (!field) continue;
    
    // Check required
    if (field.hasAttribute('required') && !value.trim()) {
      errors[key] = 'This field is required';
      continue;
    }
    
    // Check email
    if (field.type === 'email' && value && !isValidEmail(value)) {
      errors[key] = 'Invalid email address';
      continue;
    }
    
    // Check phone
    if (field.name.includes('phone') && value && !isValidPhoneKE(value)) {
      errors[key] = 'Invalid Kenyan phone number';
      continue;
    }
    
    // Check min length
    if (field.hasAttribute('minlength')) {
      const minLength = parseInt(field.getAttribute('minlength'));
      if (value.length < minLength) {
        errors[key] = `Minimum ${minLength} characters required`;
      }
    }
  }
  
  return errors;
}

export function displayFormErrors(formElement, errors) {
  // Clear previous errors
  formElement.querySelectorAll('.form-error').forEach(el => el.remove());
  formElement.querySelectorAll('.form-group.error').forEach(el => el.classList.remove('error'));
  
  // Display new errors
  for (let [key, message] of Object.entries(errors)) {
    const field = formElement.querySelector(`[name="${key}"]`);
    if (field) {
      const group = field.closest('.form-group');
      if (group) {
        group.classList.add('error');
        const errorEl = document.createElement('div');
        errorEl.className = 'form-error';
        errorEl.textContent = message;
        group.appendChild(errorEl);
      }
    }
  }
}

// ==================== DOM MANIPULATION ====================

export function showElement(element) {
  if (element) element.classList.remove('hidden');
}

export function hideElement(element) {
  if (element) element.classList.add('hidden');
}

export function toggleElement(element) {
  if (element) element.classList.toggle('hidden');
}

export function addClass(element, className) {
  if (element) element.classList.add(className);
}

export function removeClass(element, className) {
  if (element) element.classList.remove(className);
}

export function hasClass(element, className) {
  return element && element.classList.contains(className);
}

export function setAttributes(element, attributes) {
  for (let [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
}

export function createElement(tag, className, innerHTML) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (innerHTML) element.innerHTML = innerHTML;
  return element;
}

// ==================== MODAL MANAGEMENT ====================

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    addClass(modal, 'active');
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    removeClass(modal, 'active');
  }
}

export function closeAllModals() {
  document.querySelectorAll('.modal.active').forEach(modal => {
    removeClass(modal, 'active');
  });
}

// ==================== NAVBAR ====================

export function renderNavbar(user = null) {
  const navbar = document.getElementById('navbar') || document.body;
  
  const dashLink = user ? (user.role === 'admin' ? 'dashboard-admin' : user.role === 'landlord' ? 'dashboard-landlord' : 'dashboard-tenant') + '.html' : '#';

  const navbarHTML = `
    <nav class="navbar">
      <div class="navbar-container">
        <a href="index.html" class="navbar-brand">
          <img src="images/logo.jfif" alt="HomLink" class="navbar-logo-img">
          <span class="navbar-logo-name">HomLink</span>
        </a>

        <div class="navbar-search" id="navbar-search-container"></div>

        <div class="navbar-actions">
          ${user ? `
            <button class="notification-bell" id="notification-bell">
              🔔
              <span class="notification-badge" id="notification-count" style="display: none;">0</span>
            </button>
            <div class="user-menu">
              <button class="user-menu-trigger">
                <div class="user-avatar">${(user.first_name || user.username || '?').charAt(0)}</div>
                <span class="nav-username">${user.first_name || user.username}</span>
                <span class="role-badge ${user.role}">${user.role}</span>
              </button>
              <div class="user-dropdown" id="user-dropdown">
                <a href="${dashLink}">Dashboard</a>
                <a href="profile.html">Profile</a>
                <button onclick="window.logoutUser()">Logout</button>
              </div>
            </div>
          ` : `
            <div class="navbar-auth">
              <a href="login.html" class="btn btn-secondary btn-sm">Login</a>
              <a href="register.html" class="btn btn-primary btn-sm">Register</a>
            </div>
          `}
          <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>

      <!-- Mobile drawer -->
      <div class="nav-drawer" id="nav-drawer">
        ${user ? `
          <div class="nav-drawer-user">
            <div class="user-avatar" style="width:40px;height:40px;font-size:16px;">${(user.first_name || user.username || '?').charAt(0)}</div>
            <div>
              <div style="font-weight:700;color:#fff;">${(user.first_name || '') + ' ' + (user.last_name || '') || user.username}</div>
              <span class="role-badge ${user.role}">${user.role}</span>
            </div>
          </div>
          <a href="${dashLink}" class="nav-drawer-link">Dashboard</a>
          <a href="profile.html" class="nav-drawer-link">Profile</a>
          <a href="search.html" class="nav-drawer-link">Browse Rooms</a>
          <button class="nav-drawer-link nav-drawer-logout" onclick="window.logoutUser()">Logout</button>
        ` : `
          <a href="search.html" class="nav-drawer-link">Browse Rooms</a>
          <a href="register.html" class="nav-drawer-link">Register</a>
          <a href="login.html" class="nav-drawer-link nav-drawer-login">Login</a>
        `}
      </div>
    </nav>
  `;
  
  const navContainer = document.querySelector('.navbar') || document.createElement('div');
  if (!document.querySelector('.navbar')) {
    navContainer.innerHTML = navbarHTML;
    document.body.insertBefore(navContainer, document.body.firstChild);
  } else {
    navContainer.innerHTML = navbarHTML;
  }
  
  // Hamburger toggle
  const hamburger = document.getElementById('nav-hamburger');
  const drawer    = document.getElementById('nav-drawer');
  if (hamburger && drawer) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      hamburger.classList.toggle('open');
      drawer.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.navbar')) {
        hamburger.classList.remove('open');
        drawer.classList.remove('open');
      }
    });
  }

  // Add event listeners
  const userMenuTrigger = document.querySelector('.user-menu-trigger');
  const userDropdown = document.getElementById('user-dropdown');
  
  if (userMenuTrigger && userDropdown) {
    userMenuTrigger.addEventListener('click', () => {
      userDropdown.classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu')) {
        userDropdown.classList.remove('active');
      }
    });
  }
  
  // Update notification count
  if (user) {
    updateNotificationCount();
  }
}

export function renderFooter() {
  const user = getCurrentUser();
  let landlordSection = '';
  
  if (user && user.role === 'landlord') {
    landlordSection = `
      <div class="footer-section">
        <h3>For Landlords</h3>
        <ul>
          <li><a href="dashboard-landlord.html">Dashboard</a></li>
          <li><a href="create-listing.html">Add Listing</a></li>
          <li><a href="dashboard-landlord.html">My Properties</a></li>
        </ul>
      </div>
    `;
  }
  
  const footerHTML = `
    <div class="footer-content">
      <div class="footer-section">
        <h3>About HomLink</h3>
        <ul>
          <li><a href="index.html">Home</a></li>
          <li><a href="search.html">Browse Properties</a></li>
        </ul>
      </div>
      
      ${landlordSection}
      
      <div class="footer-section">
        <h3>For Tenants</h3>
        <ul>
          <li><a href="dashboard-tenant.html">Dashboard</a></li>
          <li><a href="search.html">Search Properties</a></li>
          <li><a href="dashboard-tenant.html">Saved Properties</a></li>
        </ul>
      </div>
      
      <div class="footer-section">
        <h3>Contact Us</h3>
        <ul>
          <li><a href="mailto:ibnuhassan7064@gmail.com">ibnuhassan7064@gmail.com</a></li>
          <li><a href="tel:+254757734299">+254 757 734 299</a></li>
          <li><a href="https://wa.me/254757734299" target="_blank" rel="noopener">WhatsApp Us</a></li>
          <li><p style="color: #B0BEC5; margin-bottom: 0;">Nairobi, Kenya</p></li>
        </ul>
      </div>
    </div>
    
    <div class="footer-bottom">
      <p>&copy; 2026 HomLink. All rights reserved. | <a href="terms.html" style="color: #B0BEC5;">Terms &amp; Conditions</a></p>
    </div>
  `;
  
  const footerElement = document.getElementById('app-footer');
  if (footerElement) {
    footerElement.innerHTML = footerHTML;
  }
}

export function updateNotificationCount() {
  // This will be called from the API module when notifications are fetched
  const count = getLocalStorage('unread_notifications', 0);
  const badge = document.getElementById('notification-count');
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// ==================== PAGINATION ====================

export function renderPagination(currentPage, totalPages, onPageChange) {
  const container = document.getElementById('pagination');
  if (!container) return;
  
  let html = `
    <div class="pagination">
      <button class="btn btn-secondary" onclick="pageChange(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        ← Previous
      </button>
  `;
  
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    html += `
      <button class="btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" onclick="pageChange(${i})">
        ${i}
      </button>
    `;
  }
  
  html += `
    <button class="btn btn-secondary" onclick="pageChange(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
      Next →
    </button>
    </div>
  `;
  
  container.innerHTML = html;
  window.pageChange = onPageChange;
}

// ==================== LOADING STATES ====================

export function startLoading(element) {
  if (element) {
    element.disabled = true;
    element.dataset.originalText = element.textContent;
    element.textContent = 'Loading...';
  }
}

export function stopLoading(element) {
  if (element) {
    element.disabled = false;
    element.textContent = element.dataset.originalText || element.textContent;
  }
}

// ==================== INITIALIZATION ====================

export async function initializeApp() {
  // Add toast CSS if not present
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.innerHTML = `
      .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        max-width: 300px;
        padding: var(--spacing-lg);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        animation: slideUp var(--transition-base);
      }
      
      .toast-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--spacing-md);
      }
      
      .toast-success {
        background-color: var(--color-success);
        color: white;
      }
      
      .toast-error {
        background-color: var(--color-danger);
        color: white;
      }
      
      .toast-info {
        background-color: var(--color-info);
        color: white;
      }
      
      .toast-warning {
        background-color: var(--color-warning);
        color: white;
      }
      
      .toast-close {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: var(--font-size-lg);
        padding: 0;
      }
      
      @media (max-width: 768px) {
        .toast {
          bottom: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize on module load
initializeApp();
