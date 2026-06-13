from django.core.management.base import BaseCommand
from apps.properties.models import Amenity

AMENITIES = [
    'wifi', 'parking', 'water', 'security',
    'electricity', 'balcony', 'furnished', 'kitchen',
    'laundry', 'study_space',
]


class Command(BaseCommand):
    help = 'Seed the 10 standard amenities'

    def handle(self, *args, **kwargs):
        created = 0
        for slug in AMENITIES:
            _, is_new = Amenity.objects.get_or_create(name=slug)
            if is_new:
                created += 1
        self.stdout.write(
            self.style.SUCCESS(
                f'Amenities seeded: {created} new, {len(AMENITIES) - created} already existed.'
            )
        )
