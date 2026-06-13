"""
Properties app serializers - Optimized for Kilifi student accommodation
"""

from rest_framework import serializers
from .models import (
    County, Town, LocationArea, Landmark, Property, PropertyImage, PropertyVideo,
    Amenity, PropertyAmenity, Inquiry, FavoriteProperty, Review, SavedSearch
)


class CountySerializer(serializers.ModelSerializer):
    class Meta:
        model = County
        fields = ('id', 'name', 'slug')


class TownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Town
        fields = ('id', 'name', 'county', 'slug')


class LocationAreaSerializer(serializers.ModelSerializer):
    """Kilifi Town areas for student accommodation"""
    class Meta:
        model = LocationArea
        fields = ('id', 'name', 'slug', 'description', 'latitude', 'longitude', 'is_popular')


class LandmarkSerializer(serializers.ModelSerializer):
    """Landmarks like Pwani University for distance calculations"""
    class Meta:
        model = Landmark
        fields = ('id', 'name', 'slug', 'latitude', 'longitude', 'description', 'is_primary')


class AmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = ('id', 'name', 'get_name_display')


class PropertyImageSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = PropertyImage
        fields = ('id', 'image', 'category', 'category_display', 'is_primary', 'order', 'created_at')


class PropertyVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyVideo
        fields = ('id', 'video', 'title', 'description', 'duration_seconds', 'order', 'created_at')


class PropertyListSerializer(serializers.ModelSerializer):
    """Serializer for property listings with essential info"""
    landlord_name = serializers.CharField(source='landlord.get_full_name', read_only=True)
    location_area_name = serializers.CharField(source='location_area.name', read_only=True)
    primary_image = serializers.SerializerMethodField()
    distance_display = serializers.SerializerMethodField()
    badges = serializers.SerializerMethodField()
    
    class Meta:
        model = Property
        fields = (
            'id', 'title', 'rent_amount', 'property_type', 'listing_type', 'location_area_name',
            'estate', 'landlord_name', 'is_featured', 'is_verified', 'views_count',
            'favorites_count', 'inquiries_count', 'distance_to_landmark_km',
            'distance_display', 'badges', 'primary_image', 'created_at'
        )
    
    def get_primary_image(self, obj):
        image = obj.images.filter(is_primary=True).first() or obj.images.first()
        return PropertyImageSerializer(image).data if image else None
    
    def get_distance_display(self, obj):
        return obj.get_distance_display()
    
    def get_badges(self, obj):
        badges = []
        if obj.is_verified:
            badges.append('verified')
        if obj.is_featured:
            badges.append('featured')
        if obj.is_available:
            badges.append('available')
        if obj.distance_to_landmark_km and float(obj.distance_to_landmark_km) < 1:
            badges.append('near_campus')
        return badges


class PropertyDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single property view"""
    landlord = serializers.SerializerMethodField()
    location_area = LocationAreaSerializer(read_only=True)
    images = PropertyImageSerializer(many=True, read_only=True)
    videos = PropertyVideoSerializer(many=True, read_only=True)
    amenities = serializers.SerializerMethodField()
    reviews_avg_rating = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    distance_display = serializers.SerializerMethodField()
    primary_landmark = serializers.SerializerMethodField()
    nearby_properties = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = (
            'id', 'landlord', 'title', 'description', 'rent_amount', 'security_deposit',
            'listing_type', 'property_type', 'location_area', 'estate', 'latitude', 'longitude',
            'is_available', 'is_approved', 'is_featured', 'featured_until', 'is_verified',
            'verified_at', 'views_count', 'favorites_count', 'inquiries_count', 'whatsapp_number',
            'distance_to_landmark_km', 'distance_display', 'primary_landmark',
            'images', 'videos', 'amenities', 'reviews_avg_rating', 'is_favorited',
            'nearby_properties', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'views_count', 'favorites_count', 'inquiries_count', 'created_at', 'updated_at')
    
    def get_landlord(self, obj):
        return {
            'id': obj.landlord.id,
            'name': obj.landlord.get_full_name(),
            'username': obj.landlord.username,
            'phone_number': obj.landlord.phone_number,
            'whatsapp_number': getattr(obj.landlord.landlord_profile, 'whatsapp_number', ''),
            'is_verified': getattr(obj.landlord.landlord_profile, 'is_verified', False),
        }

    def get_amenities(self, obj):
        return AmenitySerializer(
            [pa.amenity for pa in obj.property_amenities.all()],
            many=True
        ).data
    
    def get_reviews_avg_rating(self, obj):
        reviews = obj.reviews.filter(is_approved=True)
        if reviews.exists():
            return sum([r.rating for r in reviews]) / reviews.count()
        return None
    
    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return FavoriteProperty.objects.filter(tenant=request.user, property=obj).exists()
        return False
    
    def get_distance_display(self, obj):
        return obj.get_distance_display()
    
    def get_primary_landmark(self, obj):
        landmark = Landmark.objects.filter(is_primary=True).first()
        return LandmarkSerializer(landmark).data if landmark else None
    
    def get_nearby_properties(self, obj):
        """Get 3 other properties in the same area (for recommendations)"""
        nearby = Property.objects.filter(
            location_area=obj.location_area,
            is_approved=True,
            is_available=True
        ).exclude(id=obj.id)[:3]
        return PropertyListSerializer(nearby, many=True).data


class PropertyCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating properties"""
    amenity_ids = serializers.PrimaryKeyRelatedField(
        queryset=Amenity.objects.all(),
        write_only=True,
        many=True,
        required=False
    )

    class Meta:
        model = Property
        fields = (
            'id', 'title', 'description', 'listing_type', 'rent_amount', 'security_deposit',
            'property_type', 'county', 'town', 'location_area', 'estate', 'latitude', 'longitude',
            'is_available', 'whatsapp_number', 'amenity_ids'
        )
        read_only_fields = ('id',)
    
    def create(self, validated_data):
        amenities = validated_data.pop('amenity_ids', [])
        property_obj = Property.objects.create(**validated_data)
        
        for amenity in amenities:
            PropertyAmenity.objects.create(property=property_obj, amenity=amenity)
        
        return property_obj
    
    def update(self, instance, validated_data):
        amenities = validated_data.pop('amenity_ids', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if amenities is not None:
            PropertyAmenity.objects.filter(property=instance).delete()
            for amenity in amenities:
                PropertyAmenity.objects.create(property=instance, amenity=amenity)
        
        return instance


class InquirySerializer(serializers.ModelSerializer):
    """Serializer for property inquiries"""
    tenant_name = serializers.CharField(source='tenant.get_full_name', read_only=True)
    property_title = serializers.CharField(source='property.title', read_only=True)
    
    class Meta:
        model = Inquiry
        fields = ('id', 'property', 'property_title', 'tenant', 'tenant_name', 
                  'message', 'status', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at', 'tenant')


class FavoritePropertySerializer(serializers.ModelSerializer):
    """Serializer for favorite properties"""
    property = PropertyListSerializer(read_only=True)
    property_id = serializers.PrimaryKeyRelatedField(
        queryset=Property.objects.all(),
        write_only=True,
        source='property'
    )
    
    class Meta:
        model = FavoriteProperty
        fields = ('id', 'property', 'property_id', 'created_at')
        read_only_fields = ('id', 'created_at')


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for property reviews"""
    tenant_name = serializers.CharField(source='tenant.get_full_name', read_only=True)
    property_title = serializers.CharField(source='property.title', read_only=True)
    
    class Meta:
        model = Review
        fields = ('id', 'property', 'property_title', 'tenant', 'tenant_name', 
                  'rating', 'comment', 'is_approved', 'created_at')
        read_only_fields = ('id', 'created_at', 'is_approved', 'tenant')


class SavedSearchSerializer(serializers.ModelSerializer):
    """Serializer for saved searches"""
    tenant_name = serializers.CharField(source='tenant.get_full_name', read_only=True)
    
    class Meta:
        model = SavedSearch
        fields = ('id', 'name', 'filters', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
