from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.properties.models import LocationArea, Landmark

KILIFI_AREAS = [
    # (name, latitude, longitude, is_popular)
    ('Kibaoni',      -3.6250, 39.8470, True),
    ('Charo wa Mae', -3.6320, 39.8510, False),
    ('Kaya',         -3.6280, 39.8540, False),
    ('Kisumu Ndogo', -3.6340, 39.8480, False),
    ('Mtaani',       -3.6300, 39.8500, True),
    ('Mabirikani',   -3.6360, 39.8520, False),
    ('Marembo',      -3.6310, 39.8555, False),
    ('Zimbabwe',     -3.6270, 39.8445, False),
    ('Makao',        -3.6350, 39.8465, False),
    ('Misufini',     -3.6290, 39.8530, False),
    ('Mnarani',      -3.6180, 39.8410, True),
    ('Kwa Mwango',   -3.6325, 39.8490, False),
    ('Kiwandani',    -3.6345, 39.8535, False),
    ('Bofa',         -3.6150, 39.8390, True),
]


class Command(BaseCommand):
    help = 'Seed Kilifi Town area data and the Kilifi Town landmark'

    def handle(self, *args, **kwargs):
        created_count = 0
        for name, lat, lng, popular in KILIFI_AREAS:
            slug = slugify(name)
            obj, created = LocationArea.objects.get_or_create(
                slug=slug,
                defaults={
                    'name': name,
                    'latitude': lat,
                    'longitude': lng,
                    'is_popular': popular,
                    'description': f'{name} area, Kilifi Town',
                },
            )
            if not created:
                # Update coords if they were wrong
                obj.name = name
                obj.latitude = lat
                obj.longitude = lng
                obj.is_popular = popular
                obj.save(update_fields=['name', 'latitude', 'longitude', 'is_popular'])
            else:
                created_count += 1

        # Ensure Kilifi Town landmark exists (used for distance calculation)
        Landmark.objects.get_or_create(
            slug='kilifi-town',
            defaults={
                'name': 'Kilifi Town',
                'latitude': -3.6305,
                'longitude': 39.8499,
                'description': 'Kilifi Town centre — primary distance reference point',
                'is_primary': True,
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Areas seeded: {created_count} new, {len(KILIFI_AREAS) - created_count} already existed.'
            )
        )
