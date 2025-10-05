"""
Organizations Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.utils import timezone

from .models import Organization, Membership, Claim
from .serializers import (
    OrganizationSerializer,
    MembershipSerializer,
    ClaimSerializer,
    ClaimReviewSerializer
)


class OrganizationViewSet(viewsets.ModelViewSet):
    """组织管理视图集"""
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # 获取用户加入的组织
        return Organization.objects.filter(
            members__user=user
        ).annotate(
            member_count=Count('members')
        ).distinct()

    def perform_create(self, serializer):
        # 创建组织
        organization = serializer.save()
        # 创建者自动成为管理员
        Membership.objects.create(
            user=self.request.user,
            organization=organization,
            role='admin'
        )

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """获取组织成员列表"""
        organization = self.get_object()
        memberships = Membership.objects.filter(organization=organization)
        serializer = MembershipSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """添加组织成员"""
        organization = self.get_object()

        # 检查权限：只有管理员可以添加成员
        membership = Membership.objects.filter(
            user=request.user,
            organization=organization
        ).first()

        if not membership or membership.role != 'admin':
            return Response(
                {'detail': '只有管理员可以添加成员'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')
        role = request.data.get('role', 'member')

        if not user_id:
            return Response(
                {'detail': '请提供用户ID'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 创建成员关系
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': '用户不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        membership, created = Membership.objects.get_or_create(
            user=user,
            organization=organization,
            defaults={'role': role}
        )

        if not created:
            return Response(
                {'detail': '该用户已是组织成员'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = MembershipSerializer(membership)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['put'])
    def update_member_role(self, request, pk=None):
        """更新成员角色"""
        organization = self.get_object()

        # 检查权限
        requester_membership = Membership.objects.filter(
            user=request.user,
            organization=organization
        ).first()

        if not requester_membership or requester_membership.role != 'admin':
            return Response(
                {'detail': '只有管理员可以修改成员角色'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')
        new_role = request.data.get('role')

        try:
            membership = Membership.objects.get(
                user_id=user_id,
                organization=organization
            )
        except Membership.DoesNotExist:
            return Response(
                {'detail': '成员不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        membership.role = new_role
        membership.save()

        serializer = MembershipSerializer(membership)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'])
    def remove_member(self, request, pk=None):
        """移除组织成员"""
        organization = self.get_object()

        # 检查权限
        requester_membership = Membership.objects.filter(
            user=request.user,
            organization=organization
        ).first()

        if not requester_membership or requester_membership.role != 'admin':
            return Response(
                {'detail': '只有管理员可以移除成员'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')

        try:
            membership = Membership.objects.get(
                user_id=user_id,
                organization=organization
            )

            # 不能移除创建者
            if organization.creator_id == user_id:
                return Response(
                    {'detail': '不能移除组织创建者'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            membership.delete()
            return Response({'message': '成员已移除'})

        except Membership.DoesNotExist:
            return Response(
                {'detail': '成员不存在'},
                status=status.HTTP_404_NOT_FOUND
            )


class ClaimViewSet(viewsets.ModelViewSet):
    """报销申请视图集"""
    serializer_class = ClaimSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # 获取用户相关的报销记录
        # 包括：用户自己提交的 + 用户作为管理员/财务的组织的所有报销
        admin_orgs = Organization.objects.filter(
            members__user=user,
            members__role__in=['admin', 'treasurer']
        )

        queryset = Claim.objects.filter(
            models.Q(user=user) | models.Q(organization__in=admin_orgs)
        ).distinct()

        # 按组织筛选
        org_id = self.request.query_params.get('organization')
        if org_id:
            queryset = queryset.filter(organization_id=org_id)

        # 按状态筛选
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """审核报销申请"""
        claim = self.get_object()

        # 检查权限：必须是管理员或财务
        membership = Membership.objects.filter(
            user=request.user,
            organization=claim.organization,
            role__in=['admin', 'treasurer']
        ).first()

        if not membership:
            return Response(
                {'detail': '您没有权限审核该报销申请'},
                status=status.HTTP_403_FORBIDDEN
            )

        # 不能审核自己的申请
        if claim.user == request.user:
            return Response(
                {'detail': '不能审核自己的报销申请'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 检查状态
        if claim.status != 'pending':
            return Response(
                {'detail': '该申请已被审核'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ClaimReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data['action']
        comment = serializer.validated_data.get('comment', '')

        # 更新申请状态
        claim.status = 'approved' if action == 'approve' else 'rejected'
        claim.reviewer = request.user
        claim.review_comment = comment
        claim.reviewed_at = timezone.now()
        claim.save()

        # 如果通过，创建组织账单记录
        if claim.status == 'approved':
            from transactions.models import Transaction
            from categories.models import Category

            # 查找或创建"报销"分类
            category, _ = Category.objects.get_or_create(
                user=claim.user,
                name='报销收入',
                type='income',
                defaults={'color': '#52c41a', 'icon': 'money'}
            )

            # 创建收入记录
            Transaction.objects.create(
                user=claim.user,
                category=category,
                amount=claim.amount,
                transaction_date=timezone.now().date(),
                description=f'组织报销: {claim.description}',
                organization=claim.organization
            )

        return Response({
            'message': '审核成功',
            'claim': ClaimSerializer(claim).data
        })

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """获取待审核的报销申请"""
        user = request.user

        # 获取用户作为管理员/财务的组织
        admin_orgs = Organization.objects.filter(
            members__user=user,
            members__role__in=['admin', 'treasurer']
        )

        pending_claims = Claim.objects.filter(
            organization__in=admin_orgs,
            status='pending'
        ).exclude(user=user)

        serializer = self.get_serializer(pending_claims, many=True)
        return Response(serializer.data)