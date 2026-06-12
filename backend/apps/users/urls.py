"""
Users app URLs
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import MyTokenObtainPairView, RegisterViewSet, UserViewSet

urlpatterns = [
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterViewSet.as_view({'post': 'register'}), name='register'),
    path('me/', UserViewSet.as_view({'get': 'me', 'put': 'update_profile', 'patch': 'update_profile'}), name='user_me'),
    path('profile/', UserViewSet.as_view({'get': 'get_profile', 'put': 'update_profile_details'}), name='user_profile'),
]
