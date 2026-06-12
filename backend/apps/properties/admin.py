from django.contrib import admin
from .models import (
    County, Town, LocationArea, Landmark, Property, PropertyImage, PropertyVideo, 
    Amenity, PropertyAmenity, Inquiry, FavoriteProperty, Review, SavedSearch
)


@admin.register(County)
class CountyAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Town)
class TownAdmin(admin.ModelAdmin):
    list_display = ('name', 'county', 'slug')
    list_filter = ('county',)
    search_fields = ('name', 'county__name')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(LocationArea)
class LocationAreaAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_popular', 'created_at')
    list_filter = ('is_popular', 'created_at')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Location', {'fields': ('name', 'slug', 'description')}),
        ('Coordinates', {'fields': ('latitude', 'longitude')}),
        ('Display', {'fields': ('is_popular',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(Landmark)
class LandmarkAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_primary', 'created_at')
    list_filter = ('is_primary', 'created_at')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Landmark', {'fields': ('name', 'slug', 'description')}),
        ('Coordinates', {'fields': ('latitude', 'longitude')}),
        ('Settings', {'fields': ('is_primary',)}),
        ('Timestamps', {'fields': ('created_at',)}),
    )


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 1
    fields = ('image', 'category', 'is_primary', 'order')


class PropertyVideoInline(admin.TabularInline):
    model = PropertyVideo
    extra = 0
    fields = ('video', 'title', 'duration_seconds', 'order')


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('title', 'landlord', 'location_area', 'rent_amount', 'property_type', 'is_approved', 'is_featured', 'is_verified', 'views_count', 'created_at')
    list_filter = ('is_approved', 'is_featured', 'is_verified', 'is_available', 'property_type', 'location_area', 'created_at')
    search_fields = ('title', 'description', 'landlord__username', 'location_area__name')
    readonly_fields = ('views_count', 'favorites_count', 'inquiries_count', 'distance_to_landmark_km', 'created_at', 'updated_at')
    inlines = [PropertyImageInline, PropertyVideoInline]
    fieldsets = (
        ('Basic Info', {'fields': ('landlord', 'title', 'description', 'property_type')}),
        ('Location', {'fields': ('county', 'town', 'location_area', 'estate', 'latitude', 'longitude')}),
        ('Pricing', {'fields': ('rent_amount', 'security_deposit')}),
        ('Contact', {'fields': ('whatsapp_number',)}),
        ('Status', {'fields': ('is_available', 'is_approved', 'is_featured', 'featured_until', 'is_verified', 'verified_at')}),
        ('Metrics', {'fields': ('views_count', 'favorites_count', 'inquiries_count', 'distance_to_landmark_km')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    list_display = ('property', 'category', 'is_primary', 'order', 'created_at')
    list_filter = ('category', 'is_primary', 'created_at')
    search_fields = ('property__title',)


@admin.register(PropertyVideo)
class PropertyVideoAdmin(admin.ModelAdmin):
    list_display = ('property', 'title', 'duration_seconds', 'order', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('property__title', 'title')
    readonly_fields = ('created_at',)


@admin.register(PropertyAmenity)
class PropertyAmenityAdmin(admin.ModelAdmin):
    list_display = ('property', 'amenity')
    list_filter = ('amenity',)
    search_fields = ('property__title',)


@admin.register(SavedSearch)
class SavedSearchAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'name', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('tenant__username', 'name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ('property', 'tenant', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('property__title', 'tenant__username', 'message')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(FavoriteProperty)
class FavoritePropertyAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'property', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('tenant__username', 'property__title')


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('property', 'tenant', 'rating', 'is_approved', 'created_at')
    list_filter = ('is_approved', 'rating', 'created_at')
    search_fields = ('property__title', 'tenant__username', 'comment')

