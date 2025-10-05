"""
Categories Serializers
"""
from rest_framework import serializers
from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    """分类序列化器"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'type', 'type_display', 'icon', 'color',
            'is_default', 'order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_default']

    def validate(self, attrs):
        user = self.context['request'].user
        name = attrs.get('name')
        type_value = attrs.get('type')

        # 检查同类型下分类名称是否重复
        if self.instance:
            # 更新时排除自己
            if Category.objects.filter(
                    user=user,
                    name=name,
                    type=type_value
            ).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError({'name': '该分类已存在'})
        else:
            # 创建时检查
            if Category.objects.filter(user=user, name=name, type=type_value).exists():
                raise serializers.ValidationError({'name': '该分类已存在'})

        return attrs

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class CategoryListSerializer(serializers.ModelSerializer):
    """分类列表序列化器（包含使用统计）"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    usage_count = serializers.IntegerField(read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'type', 'type_display', 'icon', 'color',
            'is_default', 'order', 'usage_count', 'total_amount'
        ]