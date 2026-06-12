"""
Payments app models for RentConnect Kenya
"""

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Payment(models.Model):
    """M-Pesa payments for listings and upgrades"""
    
    PAYMENT_TYPE_CHOICES = [
        ('listing_fee', 'Listing Fee (KES 300)'),
        ('featured_upgrade', 'Featured Upgrade (KES 500-2000)'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    landlord = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    property = models.ForeignKey('properties.Property', on_delete=models.SET_NULL, 
                                 null=True, blank=True, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    mpesa_transaction_id = models.CharField(max_length=100, blank=True, unique=True)
    mpesa_phone = models.CharField(max_length=15)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['landlord', 'status']),
            models.Index(fields=['property']),
            models.Index(fields=['mpesa_transaction_id']),
        ]
    
    def __str__(self):
        return f"Payment {self.mpesa_transaction_id} - {self.get_payment_type_display()}"
