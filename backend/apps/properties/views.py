"""
Properties app views - Optimized for Kilifi student accommodation
"""

import logging
import cloudinary.uploader

logger = logging.getLogger(__name__)

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db.models import Q, Avg
from django.utils import timezone

from .models import (
    County, Town, LocationArea, Landmark, Property, PropertyImage, PropertyVideo,
    Amenity, PropertyAmenity, Inquiry, FavoriteProperty, Review, SavedSearch
)
from .serializers import (
    CountySerializer, TownSerializer, LocationAreaSerializer, LandmarkSerializer,
    PropertyListSerializer, PropertyDetailSerializer, PropertyCreateUpdateSerializer,
    PropertyImageSerializer, PropertyVideoSerializer, AmenitySerializer,
    InquirySerializer, FavoritePropertySerializer, ReviewSerializer, SavedSearchSerializer
)


class CountyViewSet(viewsets.ReadOnlyModelViewSet):
    """Counties in Kenya"""
    queryset = County.objects.all()
    serializer_class = CountySerializer
    permission_classes = [AllowAny]
    filterset_fields = ['name']
    search_fields = ['name']
    
    @action(detail=True, methods=['get'])
    def towns(self, request, pk=None):
        county = self.get_object()
        towns = county.towns.all()
        serializer = TownSerializer(towns, many=True)
        return Response(serializer.data)


class TownViewSet(viewsets.ReadOnlyModelViewSet):
    """Towns within counties"""
    queryset = Town.objects.all()
    serializer_class = TownSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['county']


class LocationAreaViewSet(viewsets.ReadOnlyModelViewSet):
    """Kilifi Town areas for student accommodation"""
    queryset = LocationArea.objects.all().order_by('name')
    serializer_class = LocationAreaSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['is_popular']
    search_fields = ['name', 'description']
    
    @action(detail=True, methods=['get'])
    def properties(self, request, pk=None):
        """Get properties in a specific area"""
        area = self.get_object()
        properties = area.properties.filter(is_approved=True, is_available=True)
        serializer = PropertyListSerializer(properties, many=True, context={'request': request})
        return Response(serializer.data)


class LandmarkViewSet(viewsets.ReadOnlyModelViewSet):
    """Landmarks for distance calculations (Pwani University, etc.)"""
    queryset = Landmark.objects.all()
    serializer_class = LandmarkSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['is_primary']
    
    @action(detail=True, methods=['get'])
    def nearby_properties(self, request, pk=None):
        """Get properties near this landmark"""
        landmark = self.get_object()
        # Get properties within 5km
        distance_limit = 5
        properties = Property.objects.filter(
            is_approved=True,
            is_available=True,
            distance_to_landmark_km__lte=distance_limit
        ).order_by('distance_to_landmark_km')[:20]
        serializer = PropertyListSerializer(properties, many=True, context={'request': request})
        return Response(serializer.data)


class AmenityViewSet(viewsets.ReadOnlyModelViewSet):
    """Available amenities for properties"""
    queryset = Amenity.objects.all()
    serializer_class = AmenitySerializer
    permission_classes = [AllowAny]


class PropertyViewSet(viewsets.ModelViewSet):
    """Properties with full CRUD and filtering for student accommodation"""
    queryset = Property.objects.all()
    serializer_class = PropertyListSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['property_type', 'location_area', 'is_verified', 'is_featured']
    search_fields = ['title', 'description', 'estate', 'location_area__name']
    ordering_fields = ['rent_amount', 'created_at', 'views_count', 'distance_to_landmark_km']
    ordering = ['-is_featured', '-created_at']
    
    # Actions that a landlord performs on their own property regardless of approval status
    OWNER_ACTIONS = {'upload_images', 'delete_image', 'add_video', 'update', 'partial_update', 'destroy'}

    def get_queryset(self):
        base_qs = Property.objects.select_related(
            'landlord', 'county', 'town', 'location_area'
        ).prefetch_related('images', 'videos', 'property_amenities__amenity')

        # Landlord write actions: scope to their own properties only (approved or not)
        if getattr(self, 'action', None) in self.OWNER_ACTIONS:
            user = self.request.user
            if user.is_authenticated:
                return base_qs.filter(landlord=user)

        # For retrieve: authenticated landlord can see their own unapproved listing too
        if getattr(self, 'action', None) == 'retrieve':
            user = self.request.user
            if user.is_authenticated and user.role == 'landlord':
                return base_qs.filter(Q(is_approved=True) | Q(landlord=user))

        # Public / read-only actions: only approved properties
        queryset = base_qs.filter(is_approved=True)

        # Filter by availability
        is_available = self.request.query_params.get('is_available')
        if is_available is not None:
            queryset = queryset.filter(is_available=is_available.lower() == 'true')

        # Filter by rent range
        min_rent = self.request.query_params.get('min_rent')
        max_rent = self.request.query_params.get('max_rent')
        if min_rent:
            queryset = queryset.filter(rent_amount__gte=float(min_rent))
        if max_rent:
            queryset = queryset.filter(rent_amount__lte=float(max_rent))

        # Filter by distance to landmark
        max_distance = self.request.query_params.get('max_distance')
        if max_distance:
            queryset = queryset.filter(distance_to_landmark_km__lte=float(max_distance))

        # Filter by amenities
        amenities = self.request.query_params.getlist('amenities')
        if amenities:
            for amenity_id in amenities:
                queryset = queryset.filter(property_amenities__amenity_id=amenity_id).distinct()

        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PropertyDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return PropertyCreateUpdateSerializer
        return PropertyListSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'upload_images', 'add_video']:
            return [IsAuthenticated()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        serializer.save(landlord=self.request.user, is_approved=True)
    
    def perform_update(self, serializer):
        if serializer.instance.landlord != self.request.user and not self.request.user.is_staff:
            raise PermissionError('You can only edit your own properties')
        serializer.save()
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.landlord != request.user and not request.user.is_staff:
            raise PermissionError('You can only delete your own properties')
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'], parser_classes=(MultiPartParser, FormParser))
    def upload_images(self, request, pk=None):
        """Upload images directly to Cloudinary and store the returned URL"""
        property_obj = self.get_object()

        if property_obj.landlord != request.user and not request.user.is_staff:
            return Response(
                {'error': 'You can only upload images to your own properties'},
                status=status.HTTP_403_FORBIDDEN
            )

        images = request.FILES.getlist('images')
        if not images:
            return Response({'error': 'No images provided'}, status=status.HTTP_400_BAD_REQUEST)

        category = request.data.get('category', 'ROOM')
        existing_count = property_obj.images.count()
        saved = []

        logger.info(f'upload_images: property={property_obj.id}, files={len(images)}, category={category}')

        for idx, image in enumerate(images):
            try:
                result = cloudinary.uploader.upload(
                    image,
                    folder='homlink/properties',
                    resource_type='image',
                )
                logger.info(f'Cloudinary upload OK: {result.get("secure_url")}')
            except Exception as e:
                logger.error(f'Cloudinary upload FAILED: {str(e)}')
                return Response({'error': f'Upload failed: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

            prop_image = PropertyImage.objects.create(
                property=property_obj,
                image=result['secure_url'],
                category=category,
                order=existing_count + idx,
                is_primary=(idx == 0 and existing_count == 0),
            )
            logger.info(f'PropertyImage saved: id={prop_image.id}, url={prop_image.image}')
            saved.append(PropertyImageSerializer(prop_image).data)

        return Response(saved, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'], url_path='images/(?P<image_id>[^/.]+)')
    def delete_image(self, request, pk=None, image_id=None):
        """Delete a specific image"""
        property_obj = self.get_object()
        
        if property_obj.landlord != request.user and not request.user.is_staff:
            return Response(
                {'error': 'You can only delete images from your own properties'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        image = get_object_or_404(PropertyImage, id=image_id, property=property_obj)
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'], parser_classes=(MultiPartParser, FormParser))
    def add_video(self, request, pk=None):
        """Add a video tour to property"""
        property_obj = self.get_object()
        
        if property_obj.landlord != request.user and not request.user.is_staff:
            return Response(
                {'error': 'You can only add videos to your own properties'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check video limit
        video_count = property_obj.videos.count()
        if video_count >= 3:
            return Response(
                {'error': 'Maximum 3 videos allowed per property'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = PropertyVideoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(property=property_obj)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured listings"""
        featured = Property.objects.filter(
            is_featured=True,
            is_approved=True,
            featured_until__gt=timezone.now()
        ).select_related('landlord', 'location_area').prefetch_related('images')[:10]
        serializer = PropertyListSerializer(featured, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def near_campus(self, request):
        """Get properties near Pwani University (within 1km)"""
        near_campus = Property.objects.filter(
            is_approved=True,
            is_available=True,
            distance_to_landmark_km__lte=1
        ).order_by('distance_to_landmark_km')[:20]
        serializer = PropertyListSerializer(near_campus, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_listings(self, request):
        """Get current user's property listings"""
        properties = Property.objects.filter(landlord=request.user).select_related(
            'county', 'town', 'location_area'
        ).prefetch_related('images', 'videos', 'property_amenities__amenity')
        serializer = PropertyDetailSerializer(properties, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        """Increment view count"""
        property_obj = self.get_object()
        property_obj.views_count += 1
        property_obj.save(update_fields=['views_count'])
        return Response({'views_count': property_obj.views_count})
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get most viewed properties"""
        popular = Property.objects.filter(
            is_approved=True,
            is_available=True
        ).order_by('-views_count')[:20]
        serializer = PropertyListSerializer(popular, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recently_added(self, request):
        """Get recently added properties"""
        recent = Property.objects.filter(
            is_approved=True,
            is_available=True
        ).order_by('-created_at')[:20]
        serializer = PropertyListSerializer(recent, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='for_sale')
    def for_sale(self, request):
        """Properties and land listed for sale"""
        listings = Property.objects.filter(
            listing_type='sale',
            is_approved=True,
            is_available=True,
        ).order_by('-created_at')[:20]
        serializer = PropertyListSerializer(listings, many=True, context={'request': request})
        return Response(serializer.data)


class InquiryViewSet(viewsets.ModelViewSet):
    """Property inquiries from tenants"""
    serializer_class = InquirySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'property']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Inquiry.objects.all()
        return Inquiry.objects.filter(Q(tenant=user) | Q(property__landlord=user))
    
    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user)
    
    @action(detail=False, methods=['post'])
    def create_inquiry(self, request):
        property_id = request.data.get('property_id')
        message = request.data.get('message')
        
        property_obj = get_object_or_404(Property, id=property_id)
        
        inquiry, created = Inquiry.objects.get_or_create(
            property=property_obj,
            tenant=request.user,
            defaults={'message': message, 'status': 'pending'}
        )
        
        if not created:
            inquiry.message = message
            inquiry.status = 'pending'
            inquiry.save()
        
        serializer = InquirySerializer(inquiry)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class FavoritePropertyViewSet(viewsets.ModelViewSet):
    """User's favorite properties"""
    serializer_class = FavoritePropertySerializer
    permission_classes = [IsAuthenticated]
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return FavoriteProperty.objects.filter(tenant=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user)
    
    @action(detail=False, methods=['post'])
    def add_favorite(self, request):
        property_id = request.data.get('property_id')
        property_obj = get_object_or_404(Property, id=property_id)
        
        favorite, created = FavoriteProperty.objects.get_or_create(
            tenant=request.user,
            property=property_obj
        )
        
        # Update favorites count
        property_obj.favorites_count = property_obj.favorited_by.count()
        property_obj.save(update_fields=['favorites_count'])
        
        serializer = FavoritePropertySerializer(favorite)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    @action(detail=False, methods=['delete'], url_path='remove/(?P<property_id>[^/.]+)')
    def remove_favorite(self, request, property_id=None):
        favorite = get_object_or_404(FavoriteProperty, tenant=request.user, property_id=property_id)
        favorite.delete()
        
        # Update favorites count
        property_obj = favorite.property
        property_obj.favorites_count = property_obj.favorited_by.count()
        property_obj.save(update_fields=['favorites_count'])
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReviewViewSet(viewsets.ModelViewSet):
    """Property reviews from tenants"""
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['property', 'is_approved']
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return Review.objects.filter(is_approved=True)
    
    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user)
    
    @action(detail=False, methods=['post'])
    def create_review(self, request):
        property_id = request.data.get('property_id')
        property_obj = get_object_or_404(Property, id=property_id)
        
        review, created = Review.objects.update_or_create(
            property=property_obj,
            tenant=request.user,
            defaults={
                'rating': request.data.get('rating'),
                'comment': request.data.get('comment'),
                'is_approved': False
            }
        )
        
        serializer = ReviewSerializer(review)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class SavedSearchViewSet(viewsets.ModelViewSet):
    """Saved searches for tenants"""
    serializer_class = SavedSearchSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return SavedSearch.objects.filter(tenant=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user)
    
    @action(detail=True, methods=['post'])
    def run_search(self, request, pk=None):
        """Run a saved search and return results"""
        saved_search = self.get_object()
        filters_dict = saved_search.filters
        
        # Build query based on saved filters
        queryset = Property.objects.filter(is_approved=True)
        
        if filters_dict.get('property_type'):
            queryset = queryset.filter(property_type=filters_dict['property_type'])
        
        if filters_dict.get('min_rent'):
            queryset = queryset.filter(rent_amount__gte=float(filters_dict['min_rent']))
        
        if filters_dict.get('max_rent'):
            queryset = queryset.filter(rent_amount__lte=float(filters_dict['max_rent']))
        
        if filters_dict.get('location_area'):
            queryset = queryset.filter(location_area_id=filters_dict['location_area'])
        
        serializer = PropertyListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
