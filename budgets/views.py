"""
Budgets Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Budget
from .serializers import BudgetSerializer, BudgetCreateSerializer


class BudgetViewSet(viewsets.ModelViewSet):
    """预算管理视图集"""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return BudgetCreateSerializer
        return BudgetSerializer

    def get_queryset(self):
        queryset = Budget.objects.filter(user=self.request.user)

        # 按年月筛选
        year_month = self.request.query_params.get('year_month')
        if year_month:
            queryset = queryset.filter(year_month=year_month)

        # 按分类筛选
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        # 只显示启用的
        is_active = self.request.query_params.get('is_active')
        if is_active:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    @action(detail=False, methods=['get'])
    def current_month(self, request):
        """获取当月预算"""
        current_month = timezone.now().strftime('%Y-%m')
        queryset = self.get_queryset().filter(
            year_month=current_month,
            is_active=True
        )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """获取预警的预算"""
        queryset = self.get_queryset().filter(is_active=True)

        # 筛选出需要预警的预算
        alert_budgets = []
        for budget in queryset:
            if budget.is_alert or budget.is_exceeded:
                alert_budgets.append(budget)

        serializer = self.get_serializer(alert_budgets, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def batch_create(self, request):
        """批量创建预算（为多个月份创建相同配置的预算）"""
        year_months = request.data.get('year_months', [])
        amount = request.data.get('amount')
        category = request.data.get('category')
        alert_threshold = request.data.get('alert_threshold', 80)

        if not year_months or not amount:
            return Response(
                {'detail': '请提供年月列表和预算金额'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_budgets = []
        for year_month in year_months:
            budget, created = Budget.objects.get_or_create(
                user=request.user,
                year_month=year_month,
                category_id=category if category else None,
                defaults={
                    'amount': amount,
                    'alert_threshold': alert_threshold
                }
            )
            if created:
                created_budgets.append(budget)

        serializer = self.get_serializer(created_budgets, many=True)
        return Response({
            'message': f'成功创建 {len(created_budgets)} 个预算',
            'budgets': serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def copy_to_next_month(self, request, pk=None):
        """复制到下个月"""
        budget = self.get_object()

        # 计算下个月
        from datetime import datetime
        from dateutil.relativedelta import relativedelta

        current_date = datetime.strptime(budget.year_month, '%Y-%m')
        next_month = current_date + relativedelta(months=1)
        next_month_str = next_month.strftime('%Y-%m')

        # 检查是否已存在
        if Budget.objects.filter(
                user=request.user,
                year_month=next_month_str,
                category=budget.category
        ).exists():
            return Response(
                {'detail': '下个月的预算已存在'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 创建新预算
        new_budget = Budget.objects.create(
            user=request.user,
            year_month=next_month_str,
            amount=budget.amount,
            category=budget.category,
            alert_threshold=budget.alert_threshold
        )

        serializer = self.get_serializer(new_budget)
        return Response(serializer.data, status=status.HTTP_201_CREATED)