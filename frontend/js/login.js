import { renderNavbar, showError, showSuccess, validateForm, displayFormErrors } from './utils.js';
import { login } from './api.js';
import { handleLogin, getCurrentUser } from './auth.js';

/**
 * Initialize the login page
 * Check if user is already logged in; if so, redirect to appropriate dashboard
 */
async function init() {
    try {
        // Render navbar
        const user = getCurrentUser();
        renderNavbar(user);

        // If already logged in, redirect to appropriate dashboard
        if (user) {
            if (user.role === 'admin') {
                window.location.href = 'dashboard-admin.html';
            } else if (user.role === 'landlord') {
                window.location.href = 'dashboard-landlord.html';
            } else if (user.role === 'tenant') {
                window.location.href = 'dashboard-tenant.html';
            }
            return;
        }

        // Setup login form
        setupLoginForm();
    } catch (error) {
        console.error('Init error:', error);
    }
}

/**
 * Setup login form event listeners and validation
 */
function setupLoginForm() {
    const form = document.getElementById('login-form');
    const errorAlert = document.getElementById('error-alert');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Client-side validation
        const errors = validateForm(form);
        if (Object.keys(errors).length > 0) {
            displayFormErrors(form, errors);
            return;
        }

        // Disable submit button during request
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        try {
            // Call handleLogin from auth.js
            // This will save tokens, set user state, show success, and redirect
            await handleLogin(username, password);
        } catch (error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';

            // Handle specific error messages
            const errorMessage = extractErrorMessage(error);
            showErrorMessage(errorAlert, errorMessage);

            // Log for debugging
            console.error('Login error:', error);
        }
    });
}

/**
 * Extract user-friendly error message from API response
 * @param {Error|Object} error 
 * @returns {string}
 */
function extractErrorMessage(error) {
    if (typeof error === 'string') {
        return error;
    }

    if (error.detail) {
        return error.detail;
    }

    if (error.non_field_errors && Array.isArray(error.non_field_errors)) {
        return error.non_field_errors[0];
    }

    if (error.username && Array.isArray(error.username)) {
        return error.username[0];
    }

    if (error.password && Array.isArray(error.password)) {
        return error.password[0];
    }

    // Generic fallback
    return 'Login failed. Please check your credentials and try again.';
}

/**
 * Show error message in alert box
 * @param {HTMLElement} alertEl 
 * @param {string} message 
 */
function showErrorMessage(alertEl, message) {
    alertEl.textContent = message;
    alertEl.classList.add('show');
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Clear all error messages from form
 */
function clearErrors() {
    const errorAlert = document.getElementById('error-alert');
    errorAlert.classList.remove('show');
    errorAlert.textContent = '';

    // Clear inline field errors
    document.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
    });

    document.querySelectorAll('input').forEach(input => {
        input.classList.remove('error');
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
