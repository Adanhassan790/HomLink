"""
HomLink seed command — populates Kilifi / Pwani University data.
Run: python manage.py seed_data
Re-running is safe (uses get_or_create throughout).
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.properties.models import (
    County, Town, LocationArea, Landmark, Amenity,
    Property, PropertyAmenity,
)
from apps.users.models import LandlordProfile, TenantProfile
from decimal import Decimal

User = get_user_model()

# ── Pwani University coordinates (our primary reference point) ──
PWANI_LAT = Decimal('-3.722500')
PWANI_LNG = Decimal('39.755300')


class Command(BaseCommand):
    help = 'Seed HomLink database with Kilifi / Pwani University data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('=== HomLink Seed ==='))

        self._seed_county()
        self._seed_landmark()
        self._seed_areas()
        self._seed_amenities()
        self._seed_users()
        self._seed_sample_properties()

        self.stdout.write(self.style.SUCCESS('\nSeed complete!\n'))
        self.stdout.write('Login credentials:')
        self.stdout.write('  Admin    : admin / Homlink@2024')
        self.stdout.write('  Landlord : landlord1 / Homlink@2024')
        self.stdout.write('  Tenant   : tenant1   / Homlink@2024')

    # ── County ────────────────────────────────────────────────
    def _seed_county(self):
        self.stdout.write('County...')
        kilifi, _ = County.objects.get_or_create(
            name='Kilifi', defaults={'slug': 'kilifi'}
        )
        Town.objects.get_or_create(
            name='Kilifi Town', county=kilifi,
            defaults={'slug': 'kilifi-town'}
        )
        self._kilifi = kilifi

    # ── Landmark ──────────────────────────────────────────────
    def _seed_landmark(self):
        self.stdout.write('Landmark...')
        Landmark.objects.get_or_create(
            name='Pwani University',
            defaults={
                'slug': 'pwani-university',
                'latitude': PWANI_LAT,
                'longitude': PWANI_LNG,
                'description': 'Main campus of Pwani University, Kilifi',
                'is_primary': True,
            }
        )

    # ── Location Areas ────────────────────────────────────────
    def _seed_areas(self):
        self.stdout.write('Location areas...')
        areas = [
            # (name, slug, lat, lng, is_popular, description)
            # ── Walking distance to campus (< 1.5 km) ──────
            ('Bofa Road',        'bofa-road',        '-3.7150', '39.7480', True,
             'Closest residential area to Pwani University main gate'),
            ('Tezo',             'tezo',             '-3.7080', '39.7520', True,
             'Popular student area, ~1 km from Pwani University'),
            ('Pwani University Gate', 'pwani-gate',  '-3.7220', '39.7540', True,
             'Right at the university entrance, very short walk to campus'),

            # ── Close (1.5 – 4 km) ──────────────────────────
            ('Mtondia',          'mtondia',          '-3.6920', '39.7430', True,
             'Affordable student bedsitters and single rooms'),
            ('Barani',           'barani',           '-3.7400', '39.7640', True,
             'Quiet residential neighbourhood, ~2.5 km from campus'),
            ('Chasimba',         'chasimba',         '-3.7580', '39.7750', False,
             'Inland area south of Kilifi town, ~4 km from campus'),

            # ── Kilifi Town centre (5+ km) ───────────────────
            ('Kilifi CBD',       'kilifi-cbd',       '-3.6307', '39.8499', True,
             'Kilifi central business district with shops and services'),
            ('Mwembe Tayari',    'mwembe-tayari',    '-3.6380', '39.8450', False,
             'Residential area in Kilifi town'),
            ('Shimo la Tewa',    'shimo-la-tewa',    '-3.8950', '39.7150', False,
             'Area towards Mombasa on the main highway'),
            ('Takaungu',         'takaungu',         '-3.6570', '39.7640', False,
             'Coastal village north of Kilifi, scenic area'),
        ]

        self._areas = {}
        for name, slug, lat, lng, popular, desc in areas:
            obj, _ = LocationArea.objects.get_or_create(
                name=name,
                defaults={
                    'slug': slug,
                    'latitude': Decimal(lat),
                    'longitude': Decimal(lng),
                    'is_popular': popular,
                    'description': desc,
                }
            )
            self._areas[slug] = obj
        self.stdout.write(f'  {len(areas)} areas ready.')

    # ── Amenities ─────────────────────────────────────────────
    def _seed_amenities(self):
        self.stdout.write('Amenities...')
        for name in ['wifi', 'parking', 'water', 'security', 'electricity',
                     'balcony', 'furnished', 'kitchen', 'laundry', 'study_space']:
            Amenity.objects.get_or_create(name=name)

    # ── Users ─────────────────────────────────────────────────
    def _seed_users(self):
        self.stdout.write('Users...')

        # Admin
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'ibnuhassan7064@gmail.com',
                'role': 'admin',
                'first_name': 'HomLink',
                'last_name': 'Admin',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin.set_password('Homlink@2024')
        admin.is_staff = True
        admin.is_superuser = True
        admin.role = 'admin'
        admin.save()

        # Verified landlords
        landlord_info = [
            ('landlord1', 'Ali',    'Hassan',   '0757734299'),
            ('landlord2', 'Fatuma', 'Omar',     '0712000002'),
            ('landlord3', 'John',   'Mwangi',   '0712000003'),
        ]
        self._landlords = []
        for username, first, last, phone in landlord_info:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@homlink.ke',
                    'role': 'landlord',
                    'first_name': first,
                    'last_name': last,
                    'phone_number': phone,
                }
            )
            if created:
                user.set_password('Homlink@2024')
                user.save()
            profile, _ = LandlordProfile.objects.get_or_create(
                user=user,
                defaults={
                    'national_id': f'3456789{landlord_info.index((username, first, last, phone))+1}',
                    'whatsapp_number': phone,
                    'is_verified': True,
                    'bio': f'Experienced landlord serving Pwani University students in Kilifi.',
                }
            )
            self._landlords.append(user)

        # Tenants
        for i in range(1, 4):
            user, created = User.objects.get_or_create(
                username=f'tenant{i}',
                defaults={
                    'email': f'tenant{i}@homlink.ke',
                    'role': 'tenant',
                    'first_name': f'Student',
                    'last_name': f'Test{i}',
                    'phone_number': f'072000000{i}',
                }
            )
            if created:
                user.set_password('Homlink@2024')
                user.save()
                TenantProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'budget_min': Decimal('3000'),
                        'budget_max': Decimal('15000'),
                        'max_distance_km': 3,
                    }
                )

    # ── Sample properties ─────────────────────────────────────
    def _seed_sample_properties(self):
        self.stdout.write('Sample properties...')
        kilifi_town = Town.objects.get(name='Kilifi Town')

        listings = [
            # (title, type, rent, deposit, area_slug, estate, featured, amenities, whatsapp)
            ('Spacious Bedsitter Near Pwani Gate', 'bedsitter', 5500, 5500,
             'pwani-gate', 'Sunrise Apartments', True,
             ['wifi', 'water', 'electricity', 'security'], '0757734299'),

            ('Self-Contained Single Room – Bofa Road', 'single_room', 4500, 4500,
             'bofa-road', 'Palm Court', True,
             ['water', 'electricity', 'security'], '0757734299'),

            ('Modern Studio Apartment – Tezo', 'studio', 7000, 7000,
             'tezo', 'Tezo Heights', True,
             ['wifi', 'water', 'electricity', 'furnished', 'security'], '0712000002'),

            ('1-Bedroom Flat – Mtondia', '1br', 8500, 8500,
             'mtondia', 'Green Valley', False,
             ['wifi', 'water', 'electricity', 'parking'], '0712000002'),

            ('Affordable Single Room – Barani', 'single_room', 3500, 3500,
             'barani', 'Barani Gardens', False,
             ['water', 'electricity'], '0712000003'),

            ('2-Bedroom House – Kilifi CBD', '2br', 15000, 15000,
             'kilifi-cbd', 'CBD Residences', False,
             ['wifi', 'water', 'electricity', 'parking', 'security'], '0712000003'),

            ('Furnished Bedsitter – Tezo', 'bedsitter', 6000, 6000,
             'tezo', 'Student Haven', False,
             ['wifi', 'water', 'electricity', 'furnished', 'laundry'], '0712000002'),

            ('Budget Single Room – Mtondia', 'single_room', 3000, 3000,
             'mtondia', 'Mtondia Court', False,
             ['water', 'electricity'], '0757734299'),
        ]

        amenity_cache = {a.name: a for a in Amenity.objects.all()}
        landlords_cycle = self._landlords

        for i, (title, ptype, rent, deposit, area_slug, estate, featured, amenity_names, wa) in enumerate(listings):
            area = self._areas.get(area_slug)
            landlord = landlords_cycle[i % len(landlords_cycle)]

            prop, created = Property.objects.get_or_create(
                title=title,
                defaults={
                    'landlord': landlord,
                    'description': (
                        f'Well-maintained {ptype.replace("_", " ")} in the heart of {area.name}. '
                        f'Ideal for Pwani University students. Close to campus, shops, and public transport. '
                        f'Available immediately.'
                    ),
                    'rent_amount': Decimal(str(rent)),
                    'security_deposit': Decimal(str(deposit)),
                    'property_type': ptype,
                    'county': self._kilifi,
                    'town': kilifi_town,
                    'location_area': area,
                    'estate': estate,
                    'latitude': area.latitude,
                    'longitude': area.longitude,
                    'whatsapp_number': wa,
                    'is_approved': True,
                    'is_available': True,
                    'is_featured': featured,
                    'views_count': (i + 1) * 12,
                }
            )
            if created:
                for name in amenity_names:
                    if name in amenity_cache:
                        PropertyAmenity.objects.get_or_create(
                            property=prop, amenity=amenity_cache[name]
                        )

        self.stdout.write(f'  {len(listings)} properties ready.')
