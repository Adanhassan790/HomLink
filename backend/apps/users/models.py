"""
Users app models for RentConnect Kenya
"""

from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """Extended User model with role and profile information"""
    
    ROLE_CHOICES = [
        ('tenant', 'Tenant'),
        ('landlord', 'Landlord'),
        ('admin', 'Admin'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='tenant')
    phone_number = models.CharField(max_length=15, blank=True)
    email_verified = models.BooleanField(default=False)
    profile_photo = models.ImageField(upload_to='profiles/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone_number']),
            models.Index(fields=['role']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"


class LandlordProfile(models.Model):
    """Extended profile for landlords"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='landlord_profile')
    national_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    whatsapp_number = models.CharField(max_length=15, blank=True, help_text="Format: +254...")
    bio = models.TextField(blank=True)
    total_listings = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    
    # Analytics
    total_views = models.PositiveIntegerField(default=0)
    total_favorites = models.PositiveIntegerField(default=0)
    total_inquiries = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = 'Landlord Profiles'
        indexes = [
            models.Index(fields=['is_verified']),
        ]
    
    def __str__(self):
        return f"Landlord: {self.user.get_full_name()}"


class TenantProfile(models.Model):
    """Extended profile for tenants - optimized for student accommodation"""
    
    STUDENT_TYPE_CHOICES = [
        ('fresher', 'Fresher'),
        ('returning', 'Returning Student'),
        ('parent', 'Parent Searching'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='tenant_profile')
    budget_min = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    budget_max = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    student_type = models.CharField(max_length=20, choices=STUDENT_TYPE_CHOICES, blank=True)
    preferred_location_areas = models.JSONField(default=list, blank=True, help_text="Preferred areas in Kilifi")
    max_distance_km = models.DecimalField(max_digits=5, decimal_places=2, default=5, help_text="Max distance from Pwani University")
    
    # Preferences
    preferred_room_type = models.CharField(max_length=50, blank=True)
    wants_furnished = models.BooleanField(null=True, blank=True)
    wants_wifi = models.BooleanField(null=True, blank=True)
    wants_security = models.BooleanField(null=True, blank=True)
    wants_parking = models.BooleanField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = 'Tenant Profiles'
    
    def __str__(self):
        return f"Tenant: {self.user.get_full_name()}"
