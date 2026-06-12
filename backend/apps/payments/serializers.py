"""
Payments app serializers
"""

from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    landlord_name = serializers.CharField(source='landlord.get_full_name', read_only=True)
    property_title = serializers.CharField(source='property.title', read_only=True, allow_null=True)
    
    class Meta:
        model = Payment
        fields = ('id', 'landlord', 'landlord_name', 'property', 'property_title', 'amount',
                  'payment_type', 'mpesa_transaction_id', 'mpesa_phone', 'status', 'created_at')
        read_only_fields = ('id', 'mpesa_transaction_id', 'status', 'created_at')


class MpesaInitiateSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_type = serializers.ChoiceField(choices=['listing_fee', 'featured_upgrade'])
    property_id = serializers.IntegerField(required=False, allow_null=True)
