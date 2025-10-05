"""
Reports Views
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from transactions.models import Transaction
from categories.models import Category
from budgets.models import Budget


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """仪表盘汇总数据"""
    user = request.user

    # 获取月份参数，默认当月
    year_month = request.query_params.get('month', timezone.now().strftime('%Y-%m'))
    year, month = year_month.split('-')

    # 当月交易
    monthly_transactions = Transaction.objects.filter(
        user=user,
        transaction_date__year=year,
        transaction_date__month=month
    )

    # 收入统计
    income_data = monthly_transactions.filter(
        category__type='income'
    ).aggregate(
        total=Sum('amount'),
        count=Count('id')
    )

    # 支出统计
    expense_data = monthly_transactions.filter(
        category__type='expense'
    ).aggregate(
        total=Sum('amount'),
        count=Count('id')
    )

    total_income = income_data['total'] or Decimal('0')
    total_expense = expense_data['total'] or Decimal('0')
    balance = total_income - total_expense

    # 获取当月预算
    monthly_budget = Budget.objects.filter(
        user=user,
        year_month=year_month,
        category__isnull=True,
        is_active=True
    ).first()

    budget_info = None
    if monthly_budget:
        budget_info = {
            'amount': monthly_budget.amount,
            'spent': monthly_budget.spent_amount,
            'remaining': monthly_budget.remaining_amount,
            'usage_percentage': monthly_budget.usage_percentage,
            'is_exceeded': monthly_budget.is_exceeded,
            'is_alert': monthly_budget.is_alert
        }

    # 支出分类占比（饼图数据）
    expense_by_category = monthly_transactions.filter(
        category__type='expense'
    ).values(
        'category__id', 'category__name', 'category__color', 'category__icon'
    ).annotate(
        total=Sum('amount'),
        count=Count('id')
    ).order_by('-total')

    category_distribution = []
    for item in expense_by_category:
        if total_expense > 0:
            percentage = (item['total'] / total_expense * 100).quantize(Decimal('0.01'))
        else:
            percentage = 0

        category_distribution.append({
            'category_id': item['category__id'],
            'category_name': item['category__name'],
            'category_color': item['category__color'],
            'category_icon': item['category__icon'],
            'amount': item['total'],
            'count': item['count'],
            'percentage': percentage
        })

    return Response({
        'year_month': year_month,
        'income': {
            'total': total_income,
            'count': income_data['count']
        },
        'expense': {
            'total': total_expense,
            'count': expense_data['count']
        },
        'balance': balance,
        'budget': budget_info,
        'category_distribution': category_distribution
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_report(request):
    """月度报告"""
    user = request.user
    year_month = request.query_params.get('month', timezone.now().strftime('%Y-%m'))
    year, month = year_month.split('-')

    # 当月交易
    monthly_transactions = Transaction.objects.filter(
        user=user,
        transaction_date__year=year,
        transaction_date__month=month
    )

    # 收入明细
    income_by_category = monthly_transactions.filter(
        category__type='income'
    ).values(
        'category__id', 'category__name', 'category__color'
    ).annotate(
        total=Sum('amount'),
        count=Count('id'),
        avg=Avg('amount')
    ).order_by('-total')

    # 支出明细
    expense_by_category = monthly_transactions.filter(
        category__type='expense'
    ).values(
        'category__id', 'category__name', 'category__color'
    ).annotate(
        total=Sum('amount'),
        count=Count('id'),
        avg=Avg('amount')
    ).order_by('-total')

    # 日均支出
    from calendar import monthrange
    days_in_month = monthrange(int(year), int(month))[1]
    total_expense = sum(item['total'] for item in expense_by_category)
    daily_average = total_expense / days_in_month if total_expense else 0

    # 预算使用情况
    budgets = Budget.objects.filter(
        user=user,
        year_month=year_month,
        is_active=True
    )

    budget_usage = []
    for budget in budgets:
        budget_usage.append({
            'category_id': budget.category.id if budget.category else None,
            'category_name': budget.category.name if budget.category else '总预算',
            'amount': budget.amount,
            'spent': budget.spent_amount,
            'remaining': budget.remaining_amount,
            'usage_percentage': budget.usage_percentage,
            'is_exceeded': budget.is_exceeded,
            'is_alert': budget.is_alert
        })

    return Response({
        'year_month': year_month,
        'income_detail': list(income_by_category),
        'expense_detail': list(expense_by_category),
        'daily_average_expense': daily_average,
        'budget_usage': budget_usage,
        'days_in_month': days_in_month
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def yearly_report(request):
    """年度报告"""
    user = request.user
    year = request.query_params.get('year', timezone.now().year)

    # 年度交易
    yearly_transactions = Transaction.objects.filter(
        user=user,
        transaction_date__year=year
    )

    # 总收支
    total_income = yearly_transactions.filter(
        category__type='income'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    total_expense = yearly_transactions.filter(
        category__type='expense'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    # 月度趋势
    from django.db.models.functions import TruncMonth

    monthly_trend = yearly_transactions.annotate(
        month=TruncMonth('transaction_date')
    ).values('month', 'category__type').annotate(
        total=Sum('amount')
    ).order_by('month')

    # 格式化月度数据
    trend_data = {}
    for item in monthly_trend:
        month_str = item['month'].strftime('%Y-%m')
        if month_str not in trend_data:
            trend_data[month_str] = {'income': 0, 'expense': 0}

        trans_type = item['category__type']
        trend_data[month_str][trans_type] = float(item['total'])

    monthly_data = [
        {
            'month': month,
            'income': data['income'],
            'expense': data['expense'],
            'balance': data['income'] - data['expense']
        }
        for month, data in sorted(trend_data.items())
    ]

    # 分类汇总
    category_summary = yearly_transactions.values(
        'category__type', 'category__name'
    ).annotate(
        total=Sum('amount'),
        count=Count('id')
    ).order_by('category__type', '-total')

    return Response({
        'year': year,
        'total_income': total_income,
        'total_expense': total_expense,
        'balance': total_income - total_expense,
        'monthly_trend': monthly_data,
        'category_summary': list(category_summary)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def expense_analysis(request):
    """支出分析"""
    user = request.user

    # 获取时间范围
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    if not start_date or not end_date:
        # 默认最近30天
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
    else:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

    # 筛选交易
    transactions = Transaction.objects.filter(
        user=user,
        category__type='expense',
        transaction_date__gte=start_date,
        transaction_date__lte=end_date
    )

    # 总支出
    total_expense = transactions.aggregate(Sum('amount'))['amount__sum'] or Decimal('0')

    # 平均每日支出
    days_count = (end_date - start_date).days + 1
    daily_average = total_expense / days_count if days_count > 0 else 0

    # 分类占比
    by_category = transactions.values(
        'category__id', 'category__name', 'category__color'
    ).annotate(
        total=Sum('amount'),
        count=Count('id')
    ).order_by('-total')

    # 最大单笔支出
    max_transaction = transactions.order_by('-amount').first()
    max_expense = {
        'amount': max_transaction.amount if max_transaction else 0,
        'category': max_transaction.category.name if max_transaction else '',
        'date': max_transaction.transaction_date if max_transaction else None,
        'description': max_transaction.description if max_transaction else ''
    }

    # Top 5 支出分类
    top_categories = list(by_category[:5])

    return Response({
        'start_date': start_date,
        'end_date': end_date,
        'days_count': days_count,
        'total_expense': total_expense,
        'daily_average': daily_average,
        'max_expense': max_expense,
        'top_categories': top_categories,
        'all_categories': list(by_category)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trend_analysis(request):
    """趋势分析"""
    user = request.user
    months = int(request.query_params.get('months', 12))

    # 计算日期范围
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=months * 30)

    transactions = Transaction.objects.filter(
        user=user,
        transaction_date__gte=start_date,
        transaction_date__lte=end_date
    )

    # 按月分组
    from django.db.models.functions import TruncMonth

    monthly_data = transactions.annotate(
        month=TruncMonth('transaction_date')
    ).values('month', 'category__type').annotate(
        total=Sum('amount'),
        count=Count('id'),
        avg=Avg('amount')
    ).order_by('month')

    # 格式化数据
    result = {}
    for item in monthly_data:
        month_str = item['month'].strftime('%Y-%m')
        if month_str not in result:
            result[month_str] = {
                'income': {'total': 0, 'count': 0},
                'expense': {'total': 0, 'count': 0}
            }

        trans_type = item['category__type']
        result[month_str][trans_type] = {
            'total': float(item['total']),
            'count': item['count'],
            'avg': float(item['avg'])
        }

    trend_list = []
    for month, data in sorted(result.items()):
        trend_list.append({
            'month': month,
            'income': data['income']['total'],
            'expense': data['expense']['total'],
            'balance': data['income']['total'] - data['expense']['total'],
            'income_count': data['income']['count'],
            'expense_count': data['expense']['count']
        })

    return Response({
        'months': months,
        'trend': trend_list
    })