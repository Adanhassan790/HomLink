import requests
import json

token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzgxMTY5ODc2LCJpYXQiOjE3ODExNjYyNzYsImp0aSI6IjBiOTM1NzBiZDIxYjQzOGViY2QzNzAwYjAyNGZlOWM2IiwidXNlcl9pZCI6IjE2In0.3-tDsi2OXGCa2hdcwRvXtQT0ZDoYPIrP8j8Ulc2NJrQ'

payload = {
    'title': 'Test Property from API',
    'description': 'Testing via correct endpoint URL - this should work now!',
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

response = requests.post(
    'http://localhost:8000/api/properties/properties/',
    json=payload,
    headers=headers
)

print(f'Status: {response.status_code}')
if response.status_code in [200, 201]:
    result = response.json()
    print(f'✓ SUCCESS!')
    print(f'Property ID: {result.get("id")}')
    print(f'Title: {result.get("title")}')
    print(f'Rent: {result.get("rent_amount")}')
else:
    print(f'Error: {json.dumps(response.json(), indent=2)}')
