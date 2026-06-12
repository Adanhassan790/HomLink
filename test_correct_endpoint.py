import requests
import json

# Test the correct endpoint
token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzgxMTI4NTMyLCJpYXQiOjE3ODExMjQ5MzIsImp0aSI6ImZkZjY4OTIxOTU3NjRiOGE4MjliNTUzMzFmNjc3MDljIiwidXNlcl9pZCI6IjE2In0.7GEhTmq-BsmePWOjZledqOPlfICNR1NXXBpUxflBZiA'

# Test OPTIONS
response_options = requests.options('http://localhost:8000/api/properties/properties/')
print(f'OPTIONS /api/properties/properties/')
print(f'Status: {response_options.status_code}')
print(f'Allow: {response_options.headers.get("Allow", "Not found")}')
print()

# Test POST
payload = {
    'title': 'Test Property from API',
    'description': 'Testing via correct endpoint URL',
    'rent_amount': 25000,
    'security_deposit': 25000,
    'property_type': '3br',
    'location_area': 1,
    'whatsapp_number': '0722999888',
    'is_available': True,
    'amenity_ids': [1, 2]
}

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

response_post = requests.post(
    'http://localhost:8000/api/properties/properties/',
    json=payload,
    headers=headers
)

print(f'POST /api/properties/properties/')
print(f'Status: {response_post.status_code}')
if response_post.status_code in [200, 201]:
    result = response_post.json()
    print(f'✓ SUCCESS! Created property ID: {result.get("id")}')
    print(f'Title: {result.get("title")}')
else:
    print(f'Error: {json.dumps(response_post.json(), indent=2)}')
