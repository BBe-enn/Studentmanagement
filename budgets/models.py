"""
Budgets Models
"""
from django.db import models
from django.conf import settings
from decimal import Decimal


class Budget(models.Model):
    """预算模型"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='budgets',
        verbose_name='用户'
    )
    year_month = models.CharField('年月', max_length=7)  # 格式: 2025-09
    amount = models.DecimalField('预算金额', max_digits=12, decimal_places=2)

    # 可以为总预算或分类预算
    category = models.ForeignKey(
        'categories.Category',
        on_delete=models.CASCADE,
        related_name='budgets',
        null=True,
        blank=True,
        verbose_name='分类'
    )

    # 预警阈值（百分比）
    alert_threshold = models.IntegerField('预警阈值', default=80, help_text='达到预算的百分比时预警')

    # 是否启用
    is_active = models.BooleanField('是否启用', default=True)

    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'budgets'
        verbose_name = '预算'
        verbose_name_plural = verbose_name
        unique_together = [['user', 'year_month', 'category']]
        ordering = ['-year_month']
        indexes = [
            models.Index(fields=['user', 'year_month']),
        ]

    def __str__(self):
        category_name = self.category.name if self.category else '总预算'
        return f'{self.year_month} - {category_name} - {self.amount}'

    @property
    def spent_amount(self):
        """已使用金额"""
        from transactions.models import Transaction
        from datetime import datetime

        year, month = self.year_month.split('-')

        query = Transaction.objects.filter(
            user=self.user,
            transaction_date__year=year,
            transaction_date__month=month,
            category__type='expense'
        )

        if self.category:
            query = query.filter(category=self.category)

        total = query.aggregate(models.Sum('amount'))['amount__sum']
        return total or Decimal('0')

    @property
    def remaining_amount(self):
        """剩余金额"""
        return self.amount - self.spent_amount

    @property
    def usage_percentage(self):
        """使用百分比"""
        if self.amount == 0:
            return 0
        return (self.spent_amount / self.amount * 100).quantize(Decimal('0.01'))

    @property
    def is_exceeded(self):
        """是否超出预算"""
        return self.spent_amount > self.amount

    @property
    def is_alert(self):
        """是否需要预警"""
        return self.usage_percentage >= self.alert_threshold