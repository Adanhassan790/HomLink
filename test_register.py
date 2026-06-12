import requests
import json

# Register a new landlord  
payload = {
    "username": "john_landlord_test",
    "email": "john.landlord@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "first_name": "John",
    "last_name": "Landlord",
    "phone_number": "0722000111",
    "role": "landlord"
}

response = requests.post(
    'http://localhost:8000/api/auth/register/',
    json=payload
)

print(f'Status: {response.status_code}')
print(f'Content-Type: {response.headers.get("Content-Type")}')
if response.status_code in [200, 201]:
    print(json.dumps(response.json(), indent=2))
else:
    print(f'Error Response:')
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(f'Raw response: {response.text[:500]}')
