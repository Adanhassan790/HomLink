"""
Properties app models for HomLink - Student Accommodation in Kilifi Town
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import math

User = get_user_model()


class County(models.Model):
    """Kenyan counties"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = 'Counties'
        ordering = ['name']
        indexes = [
            models.Index(fields=['slug']),
        ]
    
    def __str__(self):
        return self.name


class LocationArea(models.Model):
    """Areas within Kilifi Town (replacing county-wide search)"""
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    is_popular = models.BooleanField(default=False, help_text="Shows in featured areas")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_popular']),
        ]
    
    def __str__(self):
        return f"{self.name}, Kilifi"


class Landmark(models.Model):
    """Fixed landmarks for distance calculations (e.g., Pwani University)"""
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(unique=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    description = models.TextField(blank=True)
    is_primary = models.BooleanField(default=False, help_text="Primary landmark for distance calculations")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['is_primary']),
        ]
    
    def __str__(self):
        return self.name
    
    @staticmethod
    def haversine_distance(lat1, lon1, lat2, lon2):
        """Calculate distance in kilometers between two coordinates"""
        R = 6371  # Earth radius in km
        
        lat1_rad = math.radians(float(lat1))
        lon1_rad = math.radians(float(lon1))
        lat2_rad = math.radians(float(lat2))
        lon2_rad = math.radians(float(lon2))
        
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c
        
        return round(distance, 2)



class Town(models.Model):
    """Towns within counties"""
    name = models.CharField(max_length=100)
    county = models.ForeignKey(County, on_delete=models.CASCADE, related_name='towns')
    slug = models.SlugField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ['name', 'county']
        indexes = [
            models.Index(fields=['slug', 'county']),
        ]
    
    def __str__(self):
        return f"{self.name}, {self.county.name}"


class Amenity(models.Model):
    """Available amenities for properties - optimized for student accommodation"""
    
    AMENITY_CHOICES = [
        ('wifi', 'WiFi'),
        ('parking', 'Parking'),
        ('water', 'Water Supply'),
        ('security', 'Security'),
        ('electricity', 'Electricity'),
        ('balcony', 'Balcony'),
        ('furnished', 'Furnished'),
        ('kitchen', 'Shared Kitchen'),
        ('laundry', 'Laundry Facility'),
        ('study_space', 'Study Space'),
    ]
    
    name = models.CharField(max_length=50, choices=AMENITY_CHOICES, unique=True)
    
    class Meta:
        verbose_name_plural = 'Amenities'
        ordering = ['name']
    
    def __str__(self):
        return self.get_name_display()


class Property(models.Model):
    """Property listings - optimized for student accommodation in Kilifi"""
    
    LISTING_TYPE_CHOICES = [
        ('rent', 'For Rent'),
        ('sale', 'For Sale'),
    ]

    PROPERTY_TYPE_CHOICES = [
        ('single_room', 'Single Room'),
        ('bedsitter', 'Bedsitter'),
        ('studio', 'Studio'),
        ('1br', '1 Bedroom'),
        ('2br', '2 Bedrooms'),
        ('3br', '3 Bedrooms'),
        ('maisonette', 'Maisonette'),
        ('commercial', 'Commercial Space'),
        ('land', 'Land'),
        ('house_sale', 'House for Sale'),
    ]
    
    landlord = models.ForeignKey(User, on_delete=models.CASCADE, related_name='properties')
    title = models.CharField(max_length=200)
    description = models.TextField()
    listing_type = models.CharField(max_length=10, choices=LISTING_TYPE_CHOICES, default='rent')
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPE_CHOICES)
    county = models.ForeignKey(County, on_delete=models.SET_NULL, null=True, related_name='properties')
    town = models.ForeignKey(Town, on_delete=models.SET_NULL, null=True, related_name='properties')
    location_area = models.ForeignKey(LocationArea, on_delete=models.SET_NULL, null=True, blank=True, related_name='properties')
    estate = models.CharField(max_length=150, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    
    is_available = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    featured_until = models.DateTimeField(null=True, blank=True, help_text="Featured listing expiry date")
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    views_count = models.PositiveIntegerField(default=0)
    favorites_count = models.PositiveIntegerField(default=0)
    inquiries_count = models.PositiveIntegerField(default=0)
    whatsapp_number = models.CharField(max_length=15, blank=True)
    
    # Distance metrics (calculated on save)
    distance_to_landmark_km = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Distance in km to primary landmark")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['landlord', '-created_at']),
            models.Index(fields=['is_approved', '-created_at']),
            models.Index(fields=['is_featured', '-created_at']),
            models.Index(fields=['is_verified', '-created_at']),
            models.Index(fields=['location_area']),
            models.Index(fields=['property_type']),
            models.Index(fields=['latitude', 'longitude']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.location_area or 'Kilifi'}"
    
    def save(self, *args, **kwargs):
        """Calculate distance to primary landmark on save"""
        if self.latitude and self.longitude:
            primary_landmark = Landmark.objects.filter(is_primary=True).first()
            if primary_landmark:
                self.distance_to_landmark_km = Landmark.haversine_distance(
                    self.latitude, self.longitude,
                    primary_landmark.latitude, primary_landmark.longitude
                )
        super().save(*args, **kwargs)
    
    def get_distance_display(self):
        """Return distance in human-readable format"""
        if not self.distance_to_landmark_km:
            return None
        
        km = float(self.distance_to_landmark_km)
        meters = km * 1000
        
        if meters < 1000:
            return f"{int(meters)}m away"
        else:
            # Rough estimate: 1.4m/s walking speed, 15km/h motorcycle speed
            walk_time = int(km / 1.4 * 60)  # minutes
            bike_time = int(km / 15 * 60)   # minutes
            return f"{int(km)}km ({walk_time}m walk, {bike_time}m bike)"


class PropertyImage(models.Model):
    """Images for properties - with categories for student accommodation"""
    
    IMAGE_CATEGORY_CHOICES = [
        ('ROOM', 'Room'),
        ('COMPOUND', 'Compound/Exterior'),
        ('BUILDING', 'Building Exterior'),
    ]
    
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='images')
    image = models.URLField(max_length=500)
    category = models.CharField(max_length=20, choices=IMAGE_CATEGORY_CHOICES, default='ROOM')
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['category', 'order', '-created_at']
        indexes = [
            models.Index(fields=['property', 'category']),
            models.Index(fields=['property', 'is_primary']),
        ]
    
    def __str__(self):
        return f"{self.property.title} - {self.get_category_display()}"


class PropertyVideo(models.Model):
    """Video tours for properties - maximum 3 videos, 60 seconds each"""
    
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='videos')
    video = models.URLField(max_length=500)
    title = models.CharField(max_length=150, blank=True)
    description = models.TextField(blank=True)
    duration_seconds = models.PositiveIntegerField(default=60, validators=[MinValueValidator(1), MaxValueValidator(60)])
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', '-created_at']
        indexes = [
            models.Index(fields=['property']),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(duration_seconds__lte=60), name='video_max_60_seconds'),
        ]
    
    def __str__(self):
        return f"{self.property.title} - Video {self.order + 1}"


class PropertyAmenity(models.Model):
    """Amenities for a property (junction table)"""
    
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='property_amenities')
    amenity = models.ForeignKey(Amenity, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ['property', 'amenity']
        verbose_name_plural = 'Property Amenities'
    
    def __str__(self):
        return f"{self.property.title} - {self.amenity.get_name_display()}"


class SavedSearch(models.Model):
    """Saved searches for tenants"""
    
    tenant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_searches')
    name = models.CharField(max_length=150)
    filters = models.JSONField(help_text="Saved filter criteria as JSON")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant']),
        ]
    
    def __str__(self):
        return f"{self.tenant.username} - {self.name}"


class Inquiry(models.Model):
    """Tenant inquiries about properties"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('responded', 'Responded'),
        ('closed', 'Closed'),
    ]
    
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='inquiries')
    tenant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inquiries')
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['property', 'tenant']
        indexes = [
            models.Index(fields=['property', 'status']),
            models.Index(fields=['tenant']),
        ]
    
    def __str__(self):
        return f"Inquiry from {self.tenant.username} for {self.property.title}"


class FavoriteProperty(models.Model):
    """Tenant's favorite properties"""
    
    tenant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['tenant', 'property']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant']),
        ]
    
    def __str__(self):
        return f"{self.tenant.username} favorited {self.property.title}"


class Review(models.Model):
    """Tenant reviews for properties"""
    
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='reviews')
    tenant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['property', 'tenant']
        indexes = [
            models.Index(fields=['property', 'is_approved']),
        ]
    
    def __str__(self):
        return f"Review for {self.property.title} by {self.tenant.username}"
