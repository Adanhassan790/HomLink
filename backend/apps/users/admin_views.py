"""
Users app admin views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .serializers import UserSerializer, UserDetailSerializer
from .models import LandlordProfile
from apps.properties.models import Property
from apps.properties.serializers import PropertyDetailSerializer

User = get_user_model()


class AdminViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['list_users', 'get_user']:
            return [IsAdminUser()]
        if self.action in ['verify_landlord']:
            return [IsAdminUser()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'])
    def list_users(self, request):
        users = User.objects.all().select_related(
            'landlord_profile', 'tenant_profile'
        ).order_by('-date_joined')
        serializer = UserDetailSerializer(users, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def get_user(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='landlords/(?P<landlord_id>[^/.]+)/verify')
    def verify_landlord(self, request, landlord_id=None):
        landlord = get_object_or_404(User, id=landlord_id, role='landlord')
        profile = get_object_or_404(LandlordProfile, user=landlord)
        profile.is_verified = True
        profile.save()
        return Response({'message': 'Landlord verified successfully'})
    
    @action(detail=False, methods=['post'], url_path='landlords/(?P<landlord_id>[^/.]+)/reject')
    def reject_landlord(self, request, landlord_id=None):
        landlord = get_object_or_404(User, id=landlord_id, role='landlord')
        reason = request.data.get('reason', '')
        # Keep account but mark unverified; optionally notify via profile bio note
        profile = get_object_or_404(LandlordProfile, user=landlord)
        profile.is_verified = False
        profile.save()
        return Response({'message': 'Landlord application rejected', 'reason': reason})

    @action(detail=False, methods=['post'], url_path='properties/(?P<property_id>[^/.]+)/verify')
    def verify_property(self, request, property_id=None):
        """Verify a property"""
        property_obj = get_object_or_404(Property, id=property_id)
        property_obj.is_verified = True
        property_obj.verified_at = timezone.now()
        property_obj.save()
        serializer = PropertyDetailSerializer(property_obj)
        return Response({
            'message': 'Property verified successfully',
            'property': serializer.data
        })
    
    @action(detail=False, methods=['post'], url_path='properties/(?P<property_id>[^/.]+)/unverify')
    def unverify_property(self, request, property_id=None):
        """Remove verification from a property"""
        property_obj = get_object_or_404(Property, id=property_id)
        property_obj.is_verified = False
        property_obj.verified_at = None
        property_obj.save()
        serializer = PropertyDetailSerializer(property_obj)
        return Response({
            'message': 'Property verification removed',
            'property': serializer.data
        })
