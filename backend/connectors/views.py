from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from .models import DatabaseConnection
from .serializers import DatabaseConnectionSerializer
from .services import extract_data_with_connector


class DatabaseConnectionViewSet(viewsets.ModelViewSet):
    queryset = DatabaseConnection.objects.all()
    serializer_class = DatabaseConnectionSerializer

    def get_permissions(self):
        """Only admins can create/update/delete connections. All auth users can list and extract."""
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def extract(self, request, pk=None):
        connection = self.get_object()
        query = request.data.get('query', '')
        try:
            batch_size = int(request.data.get('batch_size', 50))
            offset = int(request.data.get('offset', 0))
        except (ValueError, TypeError):
            return Response({'error': 'batch_size and offset must be integers'}, status=status.HTTP_400_BAD_REQUEST)

        if batch_size < 1 or batch_size > 10000:
            return Response({'error': 'batch_size must be between 1 and 10000'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = extract_data_with_connector(connection, query, batch_size, offset)
            return Response({'data': data})
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': 'Extraction failed. Check your connection and query.'}, status=status.HTTP_400_BAD_REQUEST)
