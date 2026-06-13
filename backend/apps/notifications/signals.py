from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .models import Notification

User = get_user_model()


def _notify_admins(message):
    """Create a notification for every staff/admin user."""
    for admin in User.objects.filter(is_staff=True):
        Notification.objects.create(user=admin, message=message)


# ── Inquiry submitted ─────────────────────────────────────
@receiver(post_save, sender='properties.Inquiry')
def on_inquiry_created(sender, instance, created, **kwargs):
    if not created:
        return
    tenant_name = instance.tenant.get_full_name() or instance.tenant.username
    prop_title  = getattr(instance.property, 'title', 'a property')
    _notify_admins(
        f"New inquiry from {tenant_name} about \"{prop_title}\"."
    )


# ── Property submitted ────────────────────────────────────
@receiver(post_save, sender='properties.Property')
def on_property_saved(sender, instance, created, **kwargs):
    landlord_name = instance.landlord.get_full_name() or instance.landlord.username

    if created:
        _notify_admins(
            f"New listing submitted by {landlord_name}: \"{instance.title}\". Awaiting approval."
        )
        return

    # Property approved — notify the landlord (avoid duplicates)
    if instance.is_approved:
        already = Notification.objects.filter(
            user=instance.landlord,
            message__startswith=f'Your listing "{instance.title}" has been approved',
        ).exists()
        if not already:
            Notification.objects.create(
                user=instance.landlord,
                message=(
                    f'Your listing "{instance.title}" has been approved and is now live on HomLink!'
                ),
            )


# ── Landlord verified ─────────────────────────────────────
@receiver(post_save, sender='users.LandlordProfile')
def on_landlord_verified(sender, instance, created, **kwargs):
    if created or not instance.is_verified:
        return
    already = Notification.objects.filter(
        user=instance.user,
        message__startswith='Your landlord account has been verified',
    ).exists()
    if not already:
        Notification.objects.create(
            user=instance.user,
            message=(
                'Your landlord account has been verified! '
                'You can now create listings on HomLink.'
            ),
        )
