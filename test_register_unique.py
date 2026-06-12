import requests
import json
import time

timestamp = str(int(time.time()))
username = f'landlord_{timestamp[-6:]}'

payload = {
    'username': username,
    'email': f'landlord{timestamp}@example.com',
    'password': 'SecurePass123!',
    'password_confirm': 'SecurePass123!',
    'first_name': 'John',
    'last_name': 'Landlord',
    'phone_number': '0722000111',
    'role': 'landlord'
}

response = requests.post(
    'http://localhost:8000/api/auth/register/',
    json=payload
)

print(f'Username: {username}')
print(f'Status: {response.status_code}')
if response.status_code in [200, 201]:
    result = response.json()
    print(f'✓ Registration successful!')
    user_data = result.get('user', {})
    print(f'User ID: {user_data.get("id")}')
    print(f'Role: {user_data.get("role")}')
else:
    print(f'Error: {json.dumps(response.json(), indent=2)}')
