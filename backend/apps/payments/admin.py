from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('mpesa_transaction_id', 'landlord', 'payment_type', 'amount', 'status', 'created_at')
    list_filter = ('payment_type', 'status', 'created_at')
    search_fields = ('landlord__username', 'mpesa_transaction_id', 'mpesa_phone')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Payment Info', {'fields': ('landlord', 'property', 'amount', 'payment_type')}),
        ('M-Pesa', {'fields': ('mpesa_transaction_id', 'mpesa_phone')}),
        ('Status', {'fields': ('status',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
