"""
C-Money URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Frontend
    path('', views.index, name='index'),
    path('test/', views.test, name='test'),

    # API v1
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/transactions/', include('transactions.urls')),
    path('api/v1/categories/', include('categories.urls')),
    path('api/v1/budgets/', include('budgets.urls')),
    path('api/v1/reports/', include('reports.urls')),
    path('api/v1/organizations/', include('organizations.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)