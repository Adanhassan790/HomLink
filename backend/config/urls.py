"""
URL Configuration for RentConnect Kenya
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularSwaggerView, SpectacularAPIView
import os
from django.http import FileResponse, HttpResponse

# Serve frontend files with correct MIME types
def serve_frontend_file(request, filename='index.html', **kwargs):
    """Serve frontend files with correct MIME types"""
    frontend_dir = os.path.join(settings.BASE_DIR.parent, 'frontend')
    
    # Get filename from positional args or kwargs
    if not filename or filename == 'index.html':
        filename = kwargs.get('filename', 'index.html')
    
    # Remove leading slashes and 'frontend/' prefix
    filename = filename.lstrip('/')
    if filename.startswith('frontend/'):
        filename = filename[9:]
    if not filename:
        filename = 'index.html'
    
    file_path = os.path.join(frontend_dir, filename)
    
    # Validate path is within frontend_dir (security check)
    try:
        real_path = os.path.realpath(file_path)
        real_frontend_dir = os.path.realpath(frontend_dir)
        if not real_path.startswith(real_frontend_dir):
            return HttpResponse('Access denied', status=403)
    except Exception:
        pass
    
    try:
        if os.path.exists(file_path) and os.path.isfile(file_path):
            with open(file_path, 'rb') as f:
                content = f.read()
                response = HttpResponse(content)
                # Set correct MIME types
                if filename.endswith('.css'):
                    response['Content-Type'] = 'text/css; charset=utf-8'
                elif filename.endswith('.js'):
                    response['Content-Type'] = 'application/javascript; charset=utf-8'
                elif filename.endswith('.html'):
                    response['Content-Type'] = 'text/html; charset=utf-8'
                elif filename.endswith('.json'):
                    response['Content-Type'] = 'application/json'
                elif filename.endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg')):
                    ext = filename.split('.')[-1]
                    response['Content-Type'] = f'image/{ext}'
                return response
    except Exception as e:
        pass
    
    # Non-HTML assets that are missing → hard 404
    if filename.endswith(('.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.jfif', '.ico', '.woff', '.woff2')):
        return HttpResponse('File not found', status=404)

    # Unknown HTML paths → serve 404.html with proper status code
    try:
        with open(os.path.join(frontend_dir, '404.html'), 'rb') as f:
            return HttpResponse(f.read(), content_type='text/html; charset=utf-8', status=404)
    except Exception:
        return HttpResponse('Page not found', status=404)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema')),
    
    # API endpoints
    path('api/auth/', include('apps.users.urls')),
    path('api/properties/', include('apps.properties.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/admin/', include('apps.users.admin_urls')),
    
    # Frontend static files - MUST come after API routes
    # Match everything else as frontend files
    re_path(r'^(?P<filename>.+)$', serve_frontend_file, name='static-file'),
    re_path(r'^$', serve_frontend_file, name='index'),
]

# Serve uploaded media locally when Cloudinary is not configured
if getattr(settings, 'MEDIA_URL', None) and getattr(settings, 'MEDIA_ROOT', None):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
