/**
 * HomLink - Authentication Management
 * Handles JWT tokens, user state, and auth flow
 */

import { getLocalStorage, setLocalStorage, removeLocalStorage, showError, showSuccess } from './utils.js';
import { login as apiLogin, register as apiRegister, getMe as apiGetMe } from './api.js';

// ==================== USER STATE ====================

export function getCurrentUser() {
  return getLocalStorage('user', null);
}

export function isLoggedIn() {
  return !!getLocalStorage('access_token');
}

export function getUserRole() {
  const user = getCurrentUser();
  return user ? user.role : null;
}

export function setCurrentUser(user) {
  setLocalStorage('user', user);
}

export function clearCurrentUser() {
  removeLocalStorage('user');
}

// ==================== TOKEN MANAGEMENT ====================

export function getAccessToken() {
  return getLocalStorage('access_token');
}

export function setTokens(accessToken, refreshToken) {
  setLocalStorage('access_token', accessToken);
  setLocalStorage('refresh_token', refreshToken);
}

export function clearTokens() {
  removeLocalStorage('access_token');
  removeLocalStorage('refresh_token');
}

// ==================== JWT DECODE ====================
function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

// ==================== LOGIN ====================

export async function handleLogin(username, password) {
  try {
    const response = await apiLogin(username, password);
    
    // Save tokens
    setTokens(response.access, response.refresh);
    
    // Decode JWT to get user data (role, username, user_id)
    const decoded = decodeJWT(response.access);
    
    // Save user data
    const userData = {
      id: decoded?.user_id || '',
      username: decoded?.username || username,
      email: '',
      first_name: '',
      last_name: '',
      role: decoded?.role || 'tenant',
    };
    
    setCurrentUser(userData);
    
    showSuccess(`Welcome back, ${userData.username}!`);
    
    // Redirect based on role
    setTimeout(() => {
      if (userData.role === 'admin') {
        window.location.href = 'dashboard-admin.html';
      } else if (userData.role === 'landlord') {
        window.location.href = 'dashboard-landlord.html';
      } else {
        window.location.href = 'dashboard-tenant.html';
      }
    }, 500);
    
    return userData;
  } catch (error) {
    const message = error.detail || error.non_field_errors?.[0] || 'Invalid credentials';
    showError(message);
    throw error;
  }
}

// ==================== REGISTER ====================

export async function handleRegister(formData) {
  try {
    const response = await apiRegister(formData);
    
    showSuccess('Account created successfully! Please log in.');
    
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1000);
    
    return response;
  } catch (error) {
    let message = 'Registration failed';
    if (error.username) message = error.username[0];
    if (error.email) message = error.email[0];
    if (error.password) message = error.password[0];
    showError(message);
    throw error;
  }
}

// ==================== LOGOUT ====================

export function handleLogout() {
  clearTokens();
  clearCurrentUser();
  removeLocalStorage('unread_notifications');
  showSuccess('Logged out successfully');
  
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 500);
}

// ==================== SESSION CHECK ====================

export async function checkSession() {
  if (!isLoggedIn()) return null;
  
  try {
    const user = await apiGetMe();
    setCurrentUser(user);
    return user;
  } catch (error) {
    // Session invalid
    clearTokens();
    clearCurrentUser();
    return null;
  }
}

// ==================== REQUIRE AUTH ====================

export function requireAuth() {
  if (!isLoggedIn()) {
    showError('Please log in to continue');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

export function requireRole(role) {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }

  const userRole = getUserRole();
  if (userRole !== role) {
    showError('Access denied');
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

export function requireRoles(...roles) {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }

  const userRole = getUserRole();
  if (!roles.includes(userRole)) {
    showError('Access denied');
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ==================== PAGE PROTECTION ====================

export function initAuthPage() {
  const user = getCurrentUser();
  
  // Render navbar with user info
  const navbarModule = import('./utils.js').then(m => m.renderNavbar).catch(() => null);
  
  return user;
}

// ==================== GLOBAL LOGOUT FUNCTION ====================

window.logoutUser = function() {
  handleLogout();
};

// ==================== INITIALIZE ====================

// Check session on app load
export async function initAuth() {
  const hasToken = getAccessToken();
  
  if (hasToken) {
    try {
      const user = await checkSession();
      return user;
    } catch (error) {
      console.error('Session check failed:', error);
      clearTokens();
      clearCurrentUser();
      return null;
    }
  }
  
  return null;
}

// Auto-initialize auth on page load
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initAuth().catch(console.error);
  });
}
