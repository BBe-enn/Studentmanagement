"""
Organizations URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'organizations'

router = DefaultRouter()
router.register('', views.OrganizationViewSet, basename='organization')
router.register('claims', views.ClaimViewSet, basename='claim')

urlpatterns = [
    path('', include(router.urls)),
]