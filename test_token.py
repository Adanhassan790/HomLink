import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, 'c:\\Users\\Ibnuhassan\\Desktop\\projects\\HomLink\\backend')

django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
user = User.objects.filter(username='testlandlord2024').first()

if user:
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    print(access_token)
else:
    print('User not found')
