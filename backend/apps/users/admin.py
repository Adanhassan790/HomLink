from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, LandlordProfile, TenantProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'get_full_name', 'role', 'phone_number', 'email_verified', 'created_at')
    list_filter = ('role', 'email_verified', 'created_at')
    search_fields = ('username', 'email', 'phone_number', 'first_name', 'last_name')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone_number', 'email_verified', 'profile_photo', 'created_at', 'updated_at')}),
    )


@admin.register(LandlordProfile)
class LandlordProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'national_id', 'is_verified', 'total_listings', 'average_rating', 'created_at')
    list_filter = ('is_verified', 'created_at')
    search_fields = ('user__username', 'user__email', 'national_id')
    readonly_fields = ('created_at', 'updated_at', 'total_listings', 'average_rating', 'total_views', 'total_favorites', 'total_inquiries')
    fieldsets = (
        ('User', {'fields': ('user',)}),
        ('Verification', {'fields': ('national_id', 'is_verified')}),
        ('Contact', {'fields': ('whatsapp_number',)}),
        ('Profile', {'fields': ('bio', 'average_rating')}),
        ('Statistics', {'fields': ('total_listings', 'total_views', 'total_favorites', 'total_inquiries')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(TenantProfile)
class TenantProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'budget_min', 'budget_max', 'student_type', 'created_at')
    list_filter = ('student_type', 'wants_furnished', 'wants_wifi', 'created_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('User', {'fields': ('user',)}),
        ('Budget', {'fields': ('budget_min', 'budget_max')}),
        ('Student Info', {'fields': ('student_type', 'preferred_location_areas', 'max_distance_km')}),
        ('Preferences', {'fields': ('preferred_room_type', 'wants_furnished', 'wants_wifi', 'wants_security', 'wants_parking')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
