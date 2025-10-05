"""
Budgets Serializers
"""
from rest_framework import serializers
from .models import Budget
from categories.serializers import CategorySerializer


class BudgetSerializer(serializers.ModelSerializer):
    """预算序列化器"""
    category_info = CategorySerializer(source='category', read_only=True)
    spent_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    usage_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    is_exceeded = serializers.BooleanField(read_only=True)
    is_alert = serializers.BooleanField(read_only=True)

    class Meta:
        model = Budget
        fields = [
            'id', 'year_month', 'amount', 'category', 'category_info',
            'alert_threshold', 'is_active', 'spent_amount', 'remaining_amount',
            'usage_percentage', 'is_exceeded', 'is_alert',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('预算金额必须大于0')
        return value

    def validate_year_month(self, value):
        import re
        if not re.match(r'^\d{4}-\d{2}$', value):
            raise serializers.ValidationError('年月格式不正确，应为YYYY-MM')
        return value

    def validate_category(self, value):
        if value:
            user = self.context['request'].user
            if value.user != user:
                raise serializers.ValidationError('无效的分类')
            if value.type != 'expense':
                raise serializers.ValidationError('只能为支出分类设置预算')
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        year_month = attrs.get('year_month')
        category = attrs.get('category')

        # 检查是否已存在
        query = Budget.objects.filter(
            user=user,
            year_month=year_month,
            category=category
        )

        if self.instance:
            query = query.exclude(id=self.instance.id)

        if query.exists():
            raise serializers.ValidationError('该时间段的预算已存在')

        return attrs

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BudgetCreateSerializer(serializers.ModelSerializer):
    """创建预算序列化器"""

    class Meta:
        model = Budget
        fields = ['year_month', 'amount', 'category', 'alert_threshold']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('预算金额必须大于0')
        return value

    def validate_category(self, value):
        if value:
            user = self.context['request'].user
            if value.user != user:
                raise serializers.ValidationError('无效的分类')
            if value.type != 'expense':
                raise serializers.ValidationError('只能为支出分类设置预算')
        return value

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)