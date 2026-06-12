import requests

# Check OPTIONS to see what methods are available  
response_options = requests.options('http://localhost:8000/api/properties/')
print(f'OPTIONS Status: {response_options.status_code}')
print(f'Allow header: {response_options.headers.get("Allow", "Not found")}')

# Try POSTing now
token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzgxMTI4NTMyLCJpYXQiOjE3ODExMjQ5MzIsImp0aSI6ImZkZjY4OTIxOTU3NjRiOGE4MjliNTUzMzFmNjc3MDljIiwidXNlcl9pZCI6IjE2In0.7GEhTmq-BsmePWOjZledqOPlfICNR1NXXBpUxflBZiA'

payload = {
    'title': 'Test Property',
    'description': 'Test description for testing',
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
    'http://localhost:8000/api/properties/',
    json=payload,
    headers=headers
)

print(f'\nPOST Status: {response_post.status_code}')
if response_post.status_code in [200, 201]:
    print(f'Success!')
    result = response_post.json()
    print(f'Property ID: {result.get("id")}')
else:
    print(f'Error: {response_post.json()}')
