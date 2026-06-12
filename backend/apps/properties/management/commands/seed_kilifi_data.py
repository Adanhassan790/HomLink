"""
Seed data for Kilifi Town areas and landmarks
"""

from django.core.management.base import BaseCommand
from apps.properties.models import LocationArea, Landmark, Amenity


class Command(BaseCommand):
    help = 'Seeds Kilifi Town areas, landmarks, and amenities for student accommodation'

    def handle(self, *args, **options):
        self.stdout.write('Starting Kilifi Town data seeding...\n')

        # Create Kilifi Areas
        kilifi_areas = [
            {
                'name': 'Pwani University Area',
                'slug': 'pwani-university-area',
                'description': 'Properties near Pwani University campus',
                'latitude': -3.1899,
                'longitude': 39.7453,
                'is_popular': True,
            },
            {
                'name': 'Bofa',
                'slug': 'bofa',
                'description': 'Residential area with student accommodation',
                'latitude': -3.1850,
                'longitude': 39.7400,
                'is_popular': True,
            },
            {
                'name': 'Mnarani',
                'slug': 'mnarani',
                'description': 'Popular student accommodation area',
                'latitude': -3.1750,
                'longitude': 39.7450,
                'is_popular': True,
            },
            {
                'name': 'Tezo',
                'slug': 'tezo',
                'description': 'Growing residential area',
                'latitude': -3.1900,
                'longitude': 39.7350,
                'is_popular': False,
            },
            {
                'name': 'Kibaoni',
                'slug': 'kibaoni',
                'description': 'Residential neighborhood',
                'latitude': -3.1950,
                'longitude': 39.7500,
                'is_popular': False,
            },
            {
                'name': 'Majengo',
                'slug': 'majengo',
                'description': 'Central Kilifi area',
                'latitude': -3.1800,
                'longitude': 39.7300,
                'is_popular': True,
            },
            {
                'name': 'Soweto',
                'slug': 'soweto',
                'description': 'Affordable accommodation area',
                'latitude': -3.1700,
                'longitude': 39.7250,
                'is_popular': False,
            },
            {
                'name': 'Kwa Charo Wa Mae',
                'slug': 'kwa-charo-wa-mae',
                'description': 'Residential area with various property types',
                'latitude': -3.1650,
                'longitude': 39.7400,
                'is_popular': False,
            },
            {
                'name': 'Town Centre',
                'slug': 'town-centre',
                'description': 'Central business and residential district',
                'latitude': -3.1750,
                'longitude': 39.7350,
                'is_popular': True,
            },
        ]

        for area_data in kilifi_areas:
            area, created = LocationArea.objects.get_or_create(
                slug=area_data['slug'],
                defaults=area_data
            )
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f"  {status}: {area.name}")

        self.stdout.write(self.style.SUCCESS('\n✓ Kilifi areas created successfully\n'))

        # Create Pwani University as primary landmark
        landmark, created = Landmark.objects.get_or_create(
            slug='pwani-university',
            defaults={
                'name': 'Pwani University',
                'latitude': -3.1899,
                'longitude': 39.7453,
                'description': 'Pwani University - Primary reference point for distance calculations',
                'is_primary': True,
            }
        )
        status = 'Created' if created else 'Already exists'
        self.stdout.write(f"  {status}: {landmark.name} (Primary Landmark)")

        self.stdout.write(self.style.SUCCESS('✓ Pwani University landmark created successfully\n'))

        # Create/Update Student-Focused Amenities
        student_amenities = [
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

        for amenity_key, amenity_name in student_amenities:
            amenity, created = Amenity.objects.get_or_create(
                name=amenity_key,
                defaults={'name': amenity_key}
            )
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f"  {status}: {amenity.get_name_display()}")

        self.stdout.write(self.style.SUCCESS('✓ Student amenities created successfully\n'))

        self.stdout.write(self.style.SUCCESS(
            '\n✅ Kilifi Town data seeding completed successfully!\n'
            'Total Areas: 9\n'
            'Primary Landmark: Pwani University\n'
            'Amenities: 10\n'
        ))
