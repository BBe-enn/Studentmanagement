"""
Organizations Serializers
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Organization, Membership, Claim

User = get_user_model()


class OrganizationSerializer(serializers.ModelSerializer):
    """组织序列化器"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    creator_name = serializers.CharField(source='creator.display_name', read_only=True)
    member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'type', 'type_display', 'description', 'avatar',
            'creator', 'creator_name', 'is_active', 'member_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'creator', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['creator'] = self.context['request'].user
        return super().create(validated_data)


class MembershipSerializer(serializers.ModelSerializer):
    """成员关系序列化器"""
    user_name = serializers.CharField(source='user.display_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = Membership
        fields = [
            'id', 'user', 'user_name', 'user_email',
            'organization', 'organization_name',
            'role', 'role_display', 'joined_at'
        ]
        read_only_fields = ['id', 'joined_at']


class ClaimSerializer(serializers.ModelSerializer):
    """报销申请序列化器"""
    user_name = serializers.CharField(source='user.display_name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewer_name = serializers.CharField(source='reviewer.display_name', read_only=True, allow_null=True)

    class Meta:
        model = Claim
        fields = [
            'id', 'user', 'user_name', 'organization', 'organization_name',
            'amount', 'description', 'attachment', 'status', 'status_display',
            'reviewer', 'reviewer_name', 'review_comment', 'reviewed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'status', 'reviewer', 'reviewed_at',
            'created_at', 'updated_at'
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('报销金额必须大于0')
        return value

    def validate_organization(self, value):
        user = self.context['request'].user
        # 检查用户是否是该组织成员
        if not Membership.objects.filter(user=user, organization=value).exists():
            raise serializers.ValidationError('您不是该组织的成员')
        return value

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ClaimReviewSerializer(serializers.Serializer):
    """报销审核序列化器"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    comment = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['action'] == 'reject' and not attrs.get('comment'):
            raise serializers.ValidationError({'comment': '拒绝时必须填写审核意见'})
        return attrs