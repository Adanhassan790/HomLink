import requests
import json

# The fresh token
token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzgxMTI4NTMyLCJpYXQiOjE3ODExMjQ5MzIsImp0aSI6ImZkZjY4OTIxOTU3NjRiOGE4MjliNTUzMzFmNjc3MDljIiwidXNlcl9pZCI6IjE2In0.7GEhTmq-BsmePWOjZledqOPlfICNR1NXXBpUxflBZiA'

# Test data
payload = {
    'title': 'Test API Property - Beautiful 3BR',
    'description': 'Testing create property API endpoint. This is a test property to verify the API works correctly.',
    'rent_amount': 25000,
    'security_deposit': 25000,
    'property_type': '3br',
    'location_area': 1,
    'estate': 'API Test Location',
    'latitude': -3.1899,
    'longitude': 39.7453,
    'whatsapp_number': '0722999888',
    'is_available': True,
    'amenity_ids': [1, 2, 3]
}

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

response = requests.post(
    'http://localhost:8000/api/properties/',
    json=payload,
    headers=headers
)

print(f'Status: {response.status_code}')
if response.status_code in [200, 201]:
    result = response.json()
    print(f'Success! Property ID: {result.get("id")}')
    print(f'Title: {result.get("title")}')
else:
    print(f'Error: {json.dumps(response.json(), indent=2)}')
