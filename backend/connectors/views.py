from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import DatabaseConnection
from .serializers import DatabaseConnectionSerializer
from .services import extract_data_with_connector

class DatabaseConnectionViewSet(viewsets.ModelViewSet):
    queryset = DatabaseConnection.objects.all()
    serializer_class = DatabaseConnectionSerializer

    @action(detail=True, methods=['post'])
    def extract(self, request, pk=None):
        connection = self.get_object()
        query = request.data.get('query', '')
        batch_size = int(request.data.get('batch_size', 50))
        offset = int(request.data.get('offset', 0))
        
        try:
            data = extract_data_with_connector(connection, query, batch_size, offset)
            return Response({'data': data})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
