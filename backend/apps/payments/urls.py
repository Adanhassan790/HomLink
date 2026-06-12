"""
Payments app URLs
"""

from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, mpesa_callback

router = DefaultRouter()
router.register('', PaymentViewSet, basename='payment')

urlpatterns = [
    path('mpesa/callback/', mpesa_callback, name='mpesa_callback'),
] + router.urls
