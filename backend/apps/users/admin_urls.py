"""
Users app admin URLs
"""

from django.urls import path
from .admin_views import AdminViewSet
from apps.properties.admin_views import AdminPropertyViewSet

urlpatterns = [
    path('users/', AdminViewSet.as_view({'get': 'list_users'}), name='admin_list_users'),
    path('users/<int:pk>/', AdminViewSet.as_view({'get': 'get_user'}), name='admin_get_user'),
    path('landlords/<int:landlord_id>/verify/', AdminViewSet.as_view({'post': 'verify_landlord'}), name='admin_verify_landlord'),
    path('landlords/<int:landlord_id>/reject/', AdminViewSet.as_view({'post': 'reject_landlord'}), name='admin_reject_landlord'),
    path('properties/<int:property_id>/verify/', AdminViewSet.as_view({'post': 'verify_property'}), name='admin_verify_property'),
    path('properties/<int:property_id>/unverify/', AdminViewSet.as_view({'post': 'unverify_property'}), name='admin_unverify_property'),

    # Property approval queue (AdminPropertyViewSet)
    path('properties/pending/', AdminPropertyViewSet.as_view({'get': 'pending'}), name='admin_pending_properties'),
    path('properties/<int:pk>/approve/', AdminPropertyViewSet.as_view({'post': 'approve_property'}), name='admin_approve_property'),
    path('properties/<int:pk>/reject/', AdminPropertyViewSet.as_view({'post': 'reject_property'}), name='admin_reject_property'),
]
