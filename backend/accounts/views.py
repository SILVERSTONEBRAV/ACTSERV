from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth.models import User
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    if not request.user.is_staff:
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
    users = User.objects.all().order_by('-date_joined')
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def update_user_role(request, user_id):
    """Admin-only: promote/demote a user's role."""
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Prevent admin from demoting themselves
    if target_user.id == request.user.id:
        return Response({'error': 'Cannot modify your own role'}, status=status.HTTP_400_BAD_REQUEST)

    is_staff = request.data.get('is_staff')
    if is_staff is not None:
        target_user.is_staff = bool(is_staff)
        target_user.save()

    serializer = UserSerializer(target_user)
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_user(request, user_id):
    """Admin-only: delete a user account."""
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if target_user.id == request.user.id:
        return Response({'error': 'Cannot delete your own account'}, status=status.HTTP_400_BAD_REQUEST)

    username = target_user.username
    target_user.delete()
    return Response({'success': True, 'message': f'User {username} deleted'})
