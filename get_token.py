import requests
import json

# Login
response = requests.post('http://localhost:8000/api/auth/login/', json={
    'username': 'landlord_166855',
    'password': 'SecurePass123!'
})

if response.status_code == 200:
    data = response.json()
    print(json.dumps({
        'access': data.get('access'),
        'refresh': data.get('refresh'),
        'user_role': data.get('user', {}).get('role', 'unknown')
    }))
else:
    print(f'Error: {response.status_code}')
    print(response.text)
