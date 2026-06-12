/**
 * HomLink - API Wrapper Functions
 * All API calls go through here for consistency and JWT management
 */

import { getLocalStorage, setLocalStorage } from './utils.js';

// API Configuration — use same host as the page so CORS is never an issue
const API_BASE = `${window.location.protocol}//${window.location.host}`;
const API_URL = `${API_BASE}/api`;

// ==================== AUTHENTICATION ====================

export async function login(username, password) {
  return apiRequest('POST', '/auth/login/', { username, password });
}

export async function register(userData) {
  return apiRequest('POST', '/auth/register/', userData);
}

export async function refreshToken() {
  const refresh_token = getLocalStorage('refresh_token');
  if (!refresh_token) throw new Error('No refresh token');
  
  const response = await fetch(`${API_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refresh_token }),
  });
  
  if (!response.ok) throw await response.json();
  return response.json();
}

export async function getMe() {
  return apiRequest('GET', '/auth/me/', null, true);
}

export async function updateProfile(data) {
  return apiRequest('PUT', '/auth/profile/', data, true);
}

export async function getProfile() {
  return apiRequest('GET', '/auth/profile/', null, true);
}

// ==================== PROPERTIES ====================

export async function getProperties(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return apiRequest('GET', `/properties/properties/?${queryString}`, null, false);
}

export async function getProperty(id) {
  return apiRequest('GET', `/properties/properties/${id}/`, null, false);
}

export async function createProperty(data) {
  return apiRequest('POST', '/properties/properties/', data, true);
}

export async function updateProperty(id, data) {
  return apiRequest('PUT', `/properties/properties/${id}/`, data, true);
}

export async function deleteProperty(id) {
  return apiRequest('DELETE', `/properties/properties/${id}/`, null, true);
}

export async function uploadPropertyImages(propertyId, files) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const token = getLocalStorage('access_token');
  const response = await fetch(`${API_URL}/properties/properties/${propertyId}/upload_images/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) throw await response.json();
  return response.json();
}

export async function deletePropertyImage(propertyId, imageId) {
  return apiRequest('DELETE', `/properties/properties/${propertyId}/images/${imageId}/`, null, true);
}

export async function getFeaturedProperties() {
  return apiRequest('GET', '/properties/properties/featured/', null, false);
}

export async function getMyListings() {
  return apiRequest('GET', '/properties/properties/my_listings/', null, true);
}

export async function incrementPropertyViews(id) {
  return apiRequest('POST', `/properties/properties/${id}/increment_views/`, {}, true);
}

// ==================== COUNTIES & TOWNS ====================

export async function getCounties() {
  return apiRequest('GET', '/properties/counties/', null, false);
}

export async function getCounty(id) {
  return apiRequest('GET', `/properties/counties/${id}/`, null, false);
}

export async function getTowns(countyId) {
  return apiRequest('GET', `/properties/counties/${countyId}/towns/`, null, false);
}

export async function getAllTowns() {
  return apiRequest('GET', '/properties/towns/', null, false);
}

// ==================== AMENITIES ====================

export async function getAmenities() {
  return apiRequest('GET', '/properties/amenities/', null, false);
}

// ==================== INQUIRIES ====================

export async function createInquiry(propertyId, message) {
  return apiRequest('POST', '/properties/inquiries/create_inquiry/', {
    property_id: propertyId,
    message,
  }, true);
}

export async function getInquiries() {
  return apiRequest('GET', '/properties/inquiries/', null, true);
}

export async function updateInquiry(id, data) {
  return apiRequest('PUT', `/properties/inquiries/${id}/`, data, true);
}

// ==================== FAVORITES ====================

export async function addFavorite(propertyId) {
  return apiRequest('POST', '/properties/favorites/add_favorite/', {
    property_id: propertyId,
  }, true);
}

export async function removeFavorite(propertyId) {
  return apiRequest('DELETE', `/properties/favorites/remove/${propertyId}/`, null, true);
}

export async function getFavorites() {
  return apiRequest('GET', '/properties/favorites/', null, true);
}

// ==================== REVIEWS ====================

export async function createReview(propertyId, rating, comment) {
  return apiRequest('POST', '/properties/reviews/create_review/', {
    property_id: propertyId,
    rating,
    comment,
  }, true);
}

export async function getReviews(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return apiRequest('GET', `/properties/reviews/?${queryString}`, null, false);
}

// ==================== PAYMENTS ====================

export async function initiateM2Pesa(phoneNumber, amount, paymentType, propertyId = null) {
  const data = {
    phone_number: phoneNumber,
    amount,
    payment_type: paymentType,
  };
  if (propertyId) data.property_id = propertyId;
  
  return apiRequest('POST', '/payments/initiate_mpesa/', data, true);
}

export async function getPaymentHistory() {
  return apiRequest('GET', '/payments/history/', null, true);
}

export async function checkPaymentStatus(paymentId) {
  return apiRequest('GET', `/payments/status/${paymentId}/`, null, true);
}

// ==================== NOTIFICATIONS ====================

export async function getNotifications() {
  return apiRequest('GET', '/notifications/', null, true);
}

export async function getUnreadNotificationCount() {
  return apiRequest('GET', '/notifications/unread_count/', null, true);
}

export async function markNotificationAsRead(id) {
  return apiRequest('POST', `/notifications/${id}/mark_as_read/`, {}, true);
}

export async function markAllNotificationsAsRead() {
  return apiRequest('POST', '/notifications/mark_all_as_read/', {}, true);
}

// ==================== ADMIN ====================

export async function getPendingProperties() {
  return apiRequest('GET', '/admin/properties/pending/', null, true);
}

export async function approveProperty(id) {
  return apiRequest('POST', `/admin/properties/${id}/approve/`, {}, true);
}

export async function rejectProperty(id, reason) {
  return apiRequest('POST', `/admin/properties/${id}/reject/`, { reason }, true);
}

export async function getUsers() {
  return apiRequest('GET', '/admin/users/', null, true);
}

export async function verifyLandlord(landlordId) {
  return apiRequest('POST', `/admin/landlords/${landlordId}/verify/`, {}, true);
}

export async function verifyProperty(propertyId) {
  return apiRequest('POST', `/admin/properties/${propertyId}/verify/`, {}, true);
}

export async function unverifyProperty(propertyId) {
  return apiRequest('POST', `/admin/properties/${propertyId}/unverify/`, {}, true);
}

// ==================== CORE API FUNCTION ====================

async function apiRequest(method, path, data = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  
  if (auth) {
    let token = getLocalStorage('access_token');
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  const options = {
    method,
    headers,
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  let response = await fetch(API_URL + path, options);
  
  // Handle token refresh on 401
  if (response.status === 401 && auth && getLocalStorage('refresh_token')) {
    try {
      const newTokens = await refreshToken();
      setLocalStorage('access_token', newTokens.access);
      
      // Retry request with new token
      headers['Authorization'] = `Bearer ${newTokens.access}`;
      response = await fetch(API_URL + path, options);
    } catch (error) {
      // Refresh failed, redirect to login
      window.location.href = '/login.html';
      throw new Error('Session expired. Please login again.');
    }
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw error;
  }
  
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// ==================== SEARCH ====================

export async function searchProperties(filters = {}) {
  const params = {
    ...filters,
  };
  
  // Convert filter values
  if (filters.min_rent) params.min_rent = filters.min_rent;
  if (filters.max_rent) params.max_rent = filters.max_rent;
  if (filters.amenities) {
    params.amenities = Array.isArray(filters.amenities) ? filters.amenities : [filters.amenities];
  }
  
  return getProperties(params);
}

// ==================== ERROR HANDLING ====================

export function handleApiError(error) {
  if (typeof error === 'string') return error;
  if (error.detail) return error.detail;
  if (error.message) return error.message;
  
  // Handle field-specific errors
  const fieldErrors = [];
  for (let [field, messages] of Object.entries(error)) {
    if (Array.isArray(messages)) {
      fieldErrors.push(`${field}: ${messages.join(', ')}`);
    } else {
      fieldErrors.push(`${field}: ${messages}`);
    }
  }
  
  if (fieldErrors.length > 0) return fieldErrors.join('\n');
  return 'An error occurred. Please try again.';
}

// ==================== EXPORT FOR WINDOW ====================

// Make API functions available globally for inline HTML onclick handlers
window.API = {
  login,
  register,
  getMe,
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getCounties,
  getTowns,
  getAmenities,
  createInquiry,
  addFavorite,
  removeFavorite,
  createReview,
  initiateM2Pesa,
};
