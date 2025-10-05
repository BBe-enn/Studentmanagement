"""
Reports URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('summary/', views.dashboard_summary, name='dashboard_summary'),
    path('monthly/', views.monthly_report, name='monthly_report'),
    path('yearly/', views.yearly_report, name='yearly_report'),
    path('expense-analysis/', views.expense_analysis, name='expense_analysis'),
    path('trend/', views.trend_analysis, name='trend_analysis'),
]