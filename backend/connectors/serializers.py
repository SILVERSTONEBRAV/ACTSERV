from rest_framework import serializers
from .models import DatabaseConnection

class DatabaseConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatabaseConnection
        fields = ['id', 'name', 'db_type', 'host', 'port', 'username', 'password', 'database_name']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }
