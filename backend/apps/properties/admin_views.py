"""
Admin approval views for properties
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404

from .models import Property
from .serializers import PropertyDetailSerializer


class AdminPropertyViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        pending = Property.objects.filter(is_approved=False).select_related(
            'landlord', 'county', 'town'
        ).prefetch_related('images')
        serializer = PropertyDetailSerializer(pending, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve_property(self, request, pk=None):
        property_obj = get_object_or_404(Property, id=pk)
        property_obj.is_approved = True
        property_obj.save()
        return Response({'message': 'Property approved successfully'})
    
    @action(detail=True, methods=['post'], url_path='reject')
    def reject_property(self, request, pk=None):
        property_obj = get_object_or_404(Property, id=pk)
        reason = request.data.get('reason', 'No reason provided')
        property_obj.delete()
        return Response({'message': f'Property rejected: {reason}'})
