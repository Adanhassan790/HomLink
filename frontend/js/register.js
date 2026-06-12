import { renderNavbar, showSuccess, isValidEmail, isValidPhoneKE } from './utils.js';
import { register } from './api.js';
import { getCurrentUser } from './auth.js';

async function init() {
    const user = getCurrentUser();
    renderNavbar(user);

    if (user) {
        redirectByRole(user.role);
        return;
    }

    setupRoleToggle();
    setupRegisterForm();
}

function redirectByRole(role) {
    const map = { admin: 'dashboard-admin.html', landlord: 'dashboard-landlord.html', tenant: 'dashboard-tenant.html' };
    window.location.href = map[role] || 'index.html';
}

function setupRoleToggle() {
    const radios = document.querySelectorAll('input[name="role"]');
    const landlordFields = document.getElementById('landlord-fields');

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'landlord' && radio.checked) {
                landlordFields.classList.add('show');
                document.getElementById('national_id').required = true;
                document.getElementById('whatsapp_number').required = true;
            } else {
                landlordFields.classList.remove('show');
                document.getElementById('national_id').required = false;
                document.getElementById('whatsapp_number').required = false;
            }
        });
    });
}

function setupRegisterForm() {
    const form = document.getElementById('register-form');
    const errorAlert = document.getElementById('error-alert');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const fd = new FormData(form);
        const role = fd.get('role');

        const data = {
            username: fd.get('username')?.trim(),
            email: fd.get('email')?.trim(),
            password: fd.get('password'),
            password_confirm: fd.get('password_confirm'),
            first_name: fd.get('first_name')?.trim(),
            last_name: fd.get('last_name')?.trim(),
            phone_number: fd.get('phone_number')?.trim(),
            role,
        };

        if (role === 'landlord') {
            data.national_id = fd.get('national_id')?.trim();
            data.whatsapp_number = fd.get('whatsapp_number')?.trim();
            data.building_name = fd.get('building_name')?.trim();
            data.landlord_area = fd.get('landlord_area');
        }

        const errors = validateRegistration(data);
        if (Object.keys(errors).length > 0) {
            displayValidationErrors(errors);
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        try {
            await register(data);

            if (role === 'landlord') {
                showSuccess('Account created! Redirecting to verification page...');
                setTimeout(() => {
                    window.location.href = 'landlord-pending.html';
                }, 1800);
            } else {
                showSuccess('Account created! Redirecting to login...');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1800);
            }
        } catch (error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
            displayApiErrors(error, errorAlert);
        }
    });
}

function validateRegistration(data) {
    const errors = {};

    if (!data.username || data.username.length < 3) errors.username = 'Username must be at least 3 characters';
    if (!data.email) errors.email = 'Email is required';
    else if (!isValidEmail(data.email)) errors.email = 'Invalid email format';
    if (!data.first_name) errors.first_name = 'First name is required';
    if (!data.last_name) errors.last_name = 'Last name is required';
    if (!data.role) errors.role = 'Please select your account type';
    if (!data.password || data.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!data.password_confirm) errors.password_confirm = 'Please confirm your password';
    if (data.password !== data.password_confirm) errors.password_confirm = 'Passwords do not match';

    if (data.role === 'landlord') {
        if (!data.national_id || data.national_id.length < 6) errors.national_id = 'Valid National ID is required';
        if (!data.whatsapp_number) errors.whatsapp_number = 'WhatsApp number is required';
        else if (!isValidPhoneKE(data.whatsapp_number)) errors.whatsapp_number = 'Invalid Kenyan phone number';
    }

    if (!document.getElementById('terms').checked) errors.terms = 'You must agree to the Terms of Service';

    return errors;
}

function displayValidationErrors(errors) {
    Object.entries(errors).forEach(([field, message]) => {
        const el = document.getElementById(`${field}-error`);
        const input = document.getElementById(field);
        if (el) el.textContent = message;
        if (input) input.classList.add('error');
    });

    const first = document.querySelector('.form-error:not(:empty)');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function displayApiErrors(apiError, alertEl) {
    let hasFieldErrors = false;

    if (typeof apiError === 'object' && apiError !== null) {
        Object.entries(apiError).forEach(([field, messages]) => {
            const el = document.getElementById(`${field}-error`);
            const input = document.getElementById(field);
            const msg = Array.isArray(messages) ? messages[0] : messages;
            if (el) { el.textContent = msg; hasFieldErrors = true; }
            if (input) input.classList.add('error');
        });
    }

    if (!hasFieldErrors) {
        const msg = apiError?.detail || apiError?.non_field_errors?.[0] || 'Registration failed. Please try again.';
        alertEl.textContent = msg;
        alertEl.classList.add('show');
        alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function clearErrors() {
    const alertEl = document.getElementById('error-alert');
    alertEl.classList.remove('show');
    alertEl.textContent = '';
    document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
    document.querySelectorAll('input, select').forEach(el => el.classList.remove('error'));
}

document.addEventListener('DOMContentLoaded', init);
