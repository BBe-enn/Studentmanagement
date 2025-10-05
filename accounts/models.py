"""
Accounts Models
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """扩展的用户模型"""
    phone = models.CharField('手机号', max_length=11, blank=True, null=True, unique=True)
    student_id = models.CharField('学号', max_length=20, blank=True, null=True, unique=True)
    avatar = models.ImageField('头像', upload_to='avatars/', blank=True, null=True)
    nickname = models.CharField('昵称', max_length=50, blank=True)
    bio = models.TextField('个人简介', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'users'
        verbose_name = '用户'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return self.username

    @property
    def display_name(self):
        """显示名称优先级：昵称 > 用户名"""
        return self.nickname or self.username


class UserProfile(models.Model):
    """用户扩展信息"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    school = models.CharField('学校', max_length=100, blank=True)
    major = models.CharField('专业', max_length=100, blank=True)
    grade = models.CharField('年级', max_length=20, blank=True)
    monthly_budget = models.DecimalField('月度总预算', max_digits=10, decimal_places=2, default=0)
    currency = models.CharField('货币单位', max_length=10, default='CNY')

    class Meta:
        db_table = 'user_profiles'
        verbose_name = '用户资料'
        verbose_name_plural = verbose_name

    def __str__(self):
        return f'{self.user.username}的资料'