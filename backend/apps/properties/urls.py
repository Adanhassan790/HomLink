"""
Properties app URLs - Optimized for Kilifi student accommodation
"""

from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    CountyViewSet, TownViewSet, LocationAreaViewSet, LandmarkViewSet,
    PropertyViewSet, AmenityViewSet, InquiryViewSet, FavoritePropertyViewSet,
    ReviewViewSet, SavedSearchViewSet
)

router = DefaultRouter()
router.register('counties', CountyViewSet, basename='county')
router.register('towns', TownViewSet, basename='town')
router.register('areas', LocationAreaViewSet, basename='area')
router.register('landmarks', LandmarkViewSet, basename='landmark')
router.register('amenities', AmenityViewSet, basename='amenity')
router.register('properties', PropertyViewSet, basename='property')
router.register('inquiries', InquiryViewSet, basename='inquiry')
router.register('favorites', FavoritePropertyViewSet, basename='favorite')
router.register('reviews', ReviewViewSet, basename='review')
router.register('saved-searches', SavedSearchViewSet, basename='saved-search')

urlpatterns = router.urls

