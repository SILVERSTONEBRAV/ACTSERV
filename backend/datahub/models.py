from django.db import models
from django.contrib.auth.models import User
from connectors.models import DatabaseConnection

class ProcessedDataRow(models.Model):
    source_connection = models.ForeignKey(DatabaseConnection, on_delete=models.SET_NULL, null=True)
    payload = models.JSONField(default=dict)
    processed_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Data from {self.source_connection} at {self.processed_at}"

class DataFile(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_files')
    shared_with = models.ManyToManyField(User, related_name='shared_files', blank=True)
    
    file_path = models.CharField(max_length=512)
    source_metadata = models.JSONField(default=dict)
    format = models.CharField(max_length=10, choices=(('JSON', 'JSON'), ('CSV', 'CSV')))
    
    status = models.CharField(max_length=20, default='SUCCESS', choices=(('SUCCESS', 'SUCCESS'), ('FAILED', 'FAILED')))
    extraction_time_ms = models.IntegerField(default=0)
    file_size_bytes = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_path
