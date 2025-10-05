"""
Categories Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Q

from .models import Category, DEFAULT_CATEGORIES
from .serializers import CategorySerializer, CategoryListSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    """分类管理视图集"""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return CategoryListSerializer
        return CategorySerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Category.objects.filter(user=user)

        # 如果是列表请求，添加使用统计
        if self.action == 'list':
            queryset = queryset.annotate(
                usage_count=Count('transactions'),
                total_amount=Sum('transactions__amount')
            )

        # 按类型筛选
        category_type = self.request.query_params.get('type')
        if category_type:
            queryset = queryset.filter(type=category_type)

        return queryset

    def perform_destroy(self, instance):
        # 检查是否有关联的交易记录
        if instance.transactions.exists():
            raise serializers.ValidationError({
                'detail': '该分类下有交易记录，无法删除'
            })

        # 不允许删除默认分类
        if instance.is_default:
            raise serializers.ValidationError({
                'detail': '默认分类不能删除'
            })

        instance.delete()

    @action(detail=False, methods=['post'])
    def init_default(self, request):
        """初始化默认分类"""
        user = request.user
        created_count = 0

        for category_type, categories in DEFAULT_CATEGORIES.items():
            for cat_data in categories:
                _, created = Category.objects.get_or_create(
                    user=user,
                    name=cat_data['name'],
                    type=category_type,
                    defaults={
                        'icon': cat_data['icon'],
                        'color': cat_data['color'],
                        'is_default': True,
                    }
                )
                if created:
                    created_count += 1

        return Response({
            'message': f'成功创建 {created_count} 个默认分类',
            'created_count': created_count
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """分类统计"""
        user = request.user

        income_categories = Category.objects.filter(
            user=user,
            type='income'
        ).annotate(
            usage_count=Count('transactions'),
            total_amount=Sum('transactions__amount')
        )

        expense_categories = Category.objects.filter(
            user=user,
            type='expense'
        ).annotate(
            usage_count=Count('transactions'),
            total_amount=Sum('transactions__amount')
        )

        return Response({
            'income': CategoryListSerializer(income_categories, many=True).data,
            'expense': CategoryListSerializer(expense_categories, many=True).data,
        })