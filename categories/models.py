"""
Categories Models
"""
from django.db import models
from django.conf import settings


class Category(models.Model):
    """分类模型"""
    TYPE_CHOICES = [
        ('income', '收入'),
        ('expense', '支出'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='categories',
        verbose_name='用户'
    )
    name = models.CharField('分类名称', max_length=50)
    type = models.CharField('类型', max_length=10, choices=TYPE_CHOICES)
    icon = models.CharField('图标', max_length=50, blank=True)
    color = models.CharField('颜色', max_length=7, default='#1890ff')
    is_default = models.BooleanField('是否默认分类', default=False)
    order = models.IntegerField('排序', default=0)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    # 为未来的组织功能预留
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='categories',
        null=True,
        blank=True,
        verbose_name='所属组织'
    )

    class Meta:
        db_table = 'categories'
        verbose_name = '分类'
        verbose_name_plural = verbose_name
        ordering = ['order', '-created_at']
        unique_together = [['user', 'name', 'type']]
        indexes = [
            models.Index(fields=['user', 'type']),
        ]

    def __str__(self):
        return f'{self.get_type_display()} - {self.name}'


# 默认分类数据
DEFAULT_CATEGORIES = {
    'income': [
        {'name': '工资', 'icon': 'money', 'color': '#52c41a'},
        {'name': '兼职', 'icon': 'work', 'color': '#1890ff'},
        {'name': '奖学金', 'icon': 'trophy', 'color': '#faad14'},
        {'name': '生活费', 'icon': 'gift', 'color': '#eb2f96'},
        {'name': '其他收入', 'icon': 'other', 'color': '#13c2c2'},
    ],
    'expense': [
        {'name': '餐饮', 'icon': 'food', 'color': '#f5222d'},
        {'name': '交通', 'icon': 'car', 'color': '#fa8c16'},
        {'name': '购物', 'icon': 'shopping', 'color': '#eb2f96'},
        {'name': '学习', 'icon': 'book', 'color': '#1890ff'},
        {'name': '娱乐', 'icon': 'game', 'color': '#722ed1'},
        {'name': '通讯', 'icon': 'phone', 'color': '#13c2c2'},
        {'name': '住宿', 'icon': 'home', 'color': '#52c41a'},
        {'name': '医疗', 'icon': 'medicine', 'color': '#fa541c'},
        {'name': '其他支出', 'icon': 'other', 'color': '#8c8c8c'},
    ]
}