"""
Users app views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from .serializers import (
    UserSerializer, UserDetailSerializer, RegisterSerializer, 
    MyTokenObtainPairSerializer, LandlordProfileSerializer, TenantProfileSerializer
)
from .models import LandlordProfile, TenantProfile

User = get_user_model()


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class RegisterViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                UserDetailSerializer(user).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put'])
    def update_profile(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='profile')
    def get_profile(self, request):
        if request.user.role == 'landlord':
            profile, _ = LandlordProfile.objects.get_or_create(
                user=request.user,
                defaults={'whatsapp_number': request.user.phone_number or ''}
            )
            serializer = LandlordProfileSerializer(profile)
        else:
            profile, _ = TenantProfile.objects.get_or_create(user=request.user)
            serializer = TenantProfileSerializer(profile)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put'], url_path='profile')
    def update_profile_details(self, request):
        if request.user.role == 'landlord':
            profile, _ = LandlordProfile.objects.get_or_create(user=request.user)
            serializer = LandlordProfileSerializer(profile, data=request.data, partial=True)
        else:
            profile, _ = TenantProfile.objects.get_or_create(user=request.user)
            serializer = TenantProfileSerializer(profile, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
