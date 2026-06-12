import requests
import json
import time

# Create new landlord and get credentials
timestamp = str(int(time.time()))
username = f'landlord_{timestamp[-6:]}'
email = f'landlord{timestamp}@example.com'
password = 'SecurePass123!'

payload = {
    'username': username,
    'email': email,
    'password': password,
    'password_confirm': password,
    'first_name': 'John',
    'last_name': 'Landlord',
    'phone_number': '0722000111',
    'role': 'landlord'
}

# Register
response_reg = requests.post(
    'http://localhost:8000/api/auth/register/',
    json=payload
)
print(f'1. Registration Status: {response_reg.status_code}')

# Now login with same credentials
login_payload = {
    'username': username,
    'password': password
}

response_login = requests.post(
    'http://localhost:8000/api/auth/login/',
    json=login_payload
)

print(f'2. Login Status: {response_login.status_code}')
if response_login.status_code == 200:
    result = response_login.json()
    token = result.get('access')
    print(f'✓ Login successful!')
    print(f'Access token: {token[:50]}...')
    print(f'Credentials for testing:')
    print(f'  Username: {username}')
    print(f'  Email: {email}')
    print(f'  Password: {password}')
    print(f'  Token: {token}')
else:
    print(f'Login failed: {response_login.json()}')
