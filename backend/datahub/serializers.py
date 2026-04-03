from rest_framework import serializers
from .models import ProcessedDataRow, DataFile

class ProcessedDataRowSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessedDataRow
        fields = ['id', 'source_connection', 'payload', 'processed_at']

class DataFileSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = DataFile
        fields = ['id', 'owner', 'owner_name', 'shared_with', 'file_path', 'source_metadata', 'format', 'status', 'extraction_time_ms', 'file_size_bytes', 'created_at']
