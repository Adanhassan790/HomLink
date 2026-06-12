import requests
import json

response = requests.get('http://localhost:8000/api/properties/')
print(f'Status: {response.status_code}')
print(f'Content-Type: {response.headers.get("Content-Type")}')

# Check if it's list or root view
data = response.json()
if isinstance(data, dict) and 'results' in data:
    print(f'This is a paginated response with {data.get("count")} items')
    print(f'First few properties: {len(data.get("results", []))}')
elif isinstance(data, dict) and 'counties' in data:
    print('This is the API ROOT view (not properties list)')
    print(f'Keys: {list(data.keys())}')
elif isinstance(data, list):
    print(f'This is a list response with {len(data)} items')
else:
    print('Full response:')
    print(json.dumps(data, indent=2)[:500])
