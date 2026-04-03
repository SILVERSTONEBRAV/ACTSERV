from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from connectors.views import DatabaseConnectionViewSet
from datahub.views import DataHubViewSet, DataFileViewSet
from accounts.views import RegisterView, current_user, list_users, update_user_role, delete_user

router = routers.DefaultRouter()
router.register(r'connectors', DatabaseConnectionViewSet, basename='connectors')
router.register(r'datahub', DataHubViewSet, basename='datahub')
router.register(r'files', DataFileViewSet, basename='files')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    # Auth endpoints
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', current_user, name='current_user'),
    path('api/auth/users/', list_users, name='list_users'),
    # User management (admin only)
    path('api/auth/users/<int:user_id>/role/', update_user_role, name='update_user_role'),
    path('api/auth/users/<int:user_id>/', delete_user, name='delete_user'),
]
