"""
Organizations Models - 预留MIS功能
"""
from django.db import models
from django.conf import settings


class Organization(models.Model):
    """组织模型（社团、班级等）"""
    TYPE_CHOICES = [
        ('club', '社团'),
        ('class', '班级'),
        ('dormitory', '宿舍'),
        ('project', '项目组'),
        ('other', '其他'),
    ]

    name = models.CharField('组织名称', max_length=100)
    type = models.CharField('类型', max_length=20, choices=TYPE_CHOICES)
    description = models.TextField('简介', blank=True)
    avatar = models.ImageField('头像', upload_to='organizations/', blank=True, null=True)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_organizations',
        verbose_name='创建者'
    )

    is_active = models.BooleanField('是否启用', default=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'organizations'
        verbose_name = '组织'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Membership(models.Model):
    """组织成员关系"""
    ROLE_CHOICES = [
        ('admin', '管理员'),
        ('treasurer', '财务'),
        ('member', '普通成员'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='memberships',
        verbose_name='用户'
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='members',
        verbose_name='组织'
    )
    role = models.CharField('角色', max_length=20, choices=ROLE_CHOICES, default='member')

    joined_at = models.DateTimeField('加入时间', auto_now_add=True)

    class Meta:
        db_table = 'memberships'
        verbose_name = '组织成员'
        verbose_name_plural = verbose_name
        unique_together = [['user', 'organization']]
        ordering = ['-joined_at']

    def __str__(self):
        return f'{self.user.username} - {self.organization.name} - {self.get_role_display()}'


class Claim(models.Model):
    """报销申请（预留功能）"""
    STATUS_CHOICES = [
        ('pending', '待审核'),
        ('approved', '已通过'),
        ('rejected', '已拒绝'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='claims',
        verbose_name='申请人'
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='claims',
        verbose_name='组织'
    )

    amount = models.DecimalField('报销金额', max_digits=12, decimal_places=2)
    description = models.TextField('说明')
    attachment = models.FileField('附件', upload_to='claims/', blank=True, null=True)

    status = models.CharField('状态', max_length=20, choices=STATUS_CHOICES, default='pending')

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_claims',
        verbose_name='审核人'
    )
    review_comment = models.TextField('审核意见', blank=True)
    reviewed_at = models.DateTimeField('审核时间', null=True, blank=True)

    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'claims'
        verbose_name = '报销申请'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} - {self.organization.name} - {self.amount}'