"""
Users app serializers
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import LandlordProfile, TenantProfile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 
                  'phone_number', 'email_verified', 'profile_photo', 'created_at')
        read_only_fields = ('id', 'email_verified', 'created_at')


class UserDetailSerializer(serializers.ModelSerializer):
    landlord_profile = serializers.SerializerMethodField()
    tenant_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role',
                  'phone_number', 'email_verified', 'profile_photo', 'created_at',
                  'date_joined', 'landlord_profile', 'tenant_profile')
        read_only_fields = ('id', 'created_at', 'date_joined')
    
    def get_landlord_profile(self, obj):
        if obj.role == 'landlord' and hasattr(obj, 'landlord_profile'):
            return LandlordProfileSerializer(obj.landlord_profile).data
        return None
    
    def get_tenant_profile(self, obj):
        if obj.role == 'tenant' and hasattr(obj, 'tenant_profile'):
            return TenantProfileSerializer(obj.tenant_profile).data
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=['tenant', 'landlord'])
    national_id = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    whatsapp_number = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    building_name = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name',
                  'last_name', 'phone_number', 'role', 'national_id', 'whatsapp_number', 'building_name')

    def validate(self, data):
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        return data

    def create(self, validated_data):
        national_id = validated_data.pop('national_id', '') or None
        whatsapp_number = validated_data.pop('whatsapp_number', '')
        building_name = validated_data.pop('building_name', '')

        user = User.objects.create_user(**validated_data)

        if user.role == 'landlord':
            LandlordProfile.objects.create(
                user=user,
                national_id=national_id,
                whatsapp_number=whatsapp_number,
                bio=building_name,
            )
        else:
            TenantProfile.objects.create(user=user)

        return user


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def get_token(self, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['role'] = user.role
        return token


class LandlordProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = LandlordProfile
        fields = ('id', 'user', 'national_id', 'is_verified', 'whatsapp_number', 'bio',
                  'total_listings', 'average_rating', 'created_at')
        read_only_fields = ('id', 'created_at')


class TenantProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = TenantProfile
        fields = ('id', 'user', 'budget_min', 'budget_max', 'created_at')
        read_only_fields = ('id', 'created_at')
