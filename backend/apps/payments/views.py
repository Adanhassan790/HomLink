"""
Payments app views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from django.conf import settings
import base64
import requests
from datetime import datetime

from .models import Payment
from .serializers import PaymentSerializer, MpesaInitiateSerializer
from apps.properties.models import Property


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Payment.objects.all()
        return Payment.objects.filter(landlord=self.request.user)
    
    @action(detail=False, methods=['post'])
    def initiate_mpesa(self, request):
        serializer = MpesaInitiateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        phone = serializer.validated_data['phone_number']
        amount = serializer.validated_data['amount']
        payment_type = serializer.validated_data['payment_type']
        property_id = serializer.validated_data.get('property_id')
        
        # Determine amount based on payment type
        if payment_type == 'listing_fee':
            amount = 300
        elif payment_type == 'featured_upgrade':
            if not (500 <= float(amount) <= 2000):
                return Response(
                    {'error': 'Featured upgrade amount must be between KES 500 and KES 2000'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create payment record
        payment = Payment.objects.create(
            landlord=request.user,
            property_id=property_id,
            amount=amount,
            payment_type=payment_type,
            mpesa_phone=phone,
            status='pending'
        )
        
        # Initiate STK push
        try:
            stk_response = initiate_stk_push(phone, int(amount), payment.id)
            if stk_response.get('ResponseCode') == '0':
                return Response({
                    'payment_id': payment.id,
                    'message': 'STK prompt sent successfully',
                    'response_code': stk_response.get('ResponseCode')
                })
            else:
                payment.status = 'failed'
                payment.save()
                return Response(
                    {'error': f"M-Pesa error: {stk_response.get('ResponseDescription')}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            payment.status = 'failed'
            payment.save()
            return Response(
                {'error': f'Failed to initiate payment: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        payments = self.get_queryset()
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='status/(?P<payment_id>[^/.]+)')
    def check_status(self, request, payment_id=None):
        payment = get_object_or_404(Payment, id=payment_id)
        if payment.landlord != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)


@csrf_exempt
@api_view(['POST'])
def mpesa_callback(request):
    """Handle M-Pesa callback from Daraja"""
    try:
        body = request.data
        
        # Extract callback data
        result = body.get('Result', {})
        result_code = result.get('ResultCode')
        result_desc = result.get('ResultDesc')
        
        if result_code == 0:
            # Payment successful
            result_params = result.get('ResultParameters', {}).get('ResultParameter', [])
            metadata = {}
            
            for param in result_params:
                key = param.get('Key')
                value = param.get('Value')
                metadata[key] = value
            
            # Update payment record
            mpesa_transaction_id = metadata.get('MpesaReceiptNumber')
            if mpesa_transaction_id:
                payment = Payment.objects.filter(mpesa_phone=metadata.get('PhoneNumber')).last()
                if payment:
                    payment.mpesa_transaction_id = mpesa_transaction_id
                    payment.status = 'completed'
                    payment.save()
                    
                    # Activate property if it's a listing fee
                    if payment.payment_type == 'listing_fee' and payment.property:
                        payment.property.is_approved = True
                        payment.property.is_available = True
                        payment.property.save()
                    
                    # Mark as featured if upgrade
                    if payment.payment_type == 'featured_upgrade' and payment.property:
                        payment.property.is_featured = True
                        payment.property.save()
        else:
            # Payment failed
            mpesa_phone = result.get('OriginalTransaction', '')
            payment = Payment.objects.filter(mpesa_phone=mpesa_phone).last()
            if payment:
                payment.status = 'failed'
                payment.save()
        
        return Response({'message': 'Callback received'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_mpesa_token():
    """Get OAuth token from Daraja"""
    consumer_key = settings.MPESA_CONSUMER_KEY
    consumer_secret = settings.MPESA_CONSUMER_SECRET
    
    credentials = base64.b64encode(f'{consumer_key}:{consumer_secret}'.encode()).decode()
    
    if settings.MPESA_ENVIRONMENT == 'sandbox':
        url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    else:
        url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    
    headers = {'Authorization': f'Basic {credentials}'}
    
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    
    return response.json()['access_token']


def initiate_stk_push(phone_number, amount, reference):
    """Initiate STK push to customer"""
    token = get_mpesa_token()
    
    phone = phone_number.replace('+', '').replace(' ', '')
    if phone.startswith('0'):
        phone = '254' + phone[1:]
    
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password_string = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    password = base64.b64encode(password_string.encode()).decode()
    
    if settings.MPESA_ENVIRONMENT == 'sandbox':
        url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    else:
        url = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    
    payload = {
        'BusinessShortCode': settings.MPESA_SHORTCODE,
        'Password': password,
        'Timestamp': timestamp,
        'TransactionType': 'CustomerPayBillOnline',
        'Amount': amount,
        'PartyA': phone,
        'PartyB': settings.MPESA_SHORTCODE,
        'PhoneNumber': phone,
        'CallBackURL': settings.MPESA_CALLBACK_URL,
        'AccountReference': f'RentConnect-{reference}',
        'TransactionDesc': 'RentConnect Property Listing',
    }
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    response.raise_for_status()
    
    return response.json()
