"""
Frontend Views
"""
from django.shortcuts import render

def index(request):
    """前端主页面"""
    return render(request, 'index.html')

def test(request):
    """测试页面"""
    return render(request, 'test.html')
