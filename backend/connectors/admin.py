from django.contrib import admin
from .models import DatabaseConnection

@admin.register(DatabaseConnection)
class DatabaseConnectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'db_type', 'host', 'port', 'database_name')
    list_filter = ('db_type',)
    search_fields = ('name', 'host', 'database_name')
