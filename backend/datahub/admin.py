from django.contrib import admin
from .models import ProcessedDataRow, DataFile

@admin.register(ProcessedDataRow)
class ProcessedDataRowAdmin(admin.ModelAdmin):
    list_display = ('id', 'source_connection', 'processed_at')
    list_filter = ('source_connection',)

@admin.register(DataFile)
class DataFileAdmin(admin.ModelAdmin):
    list_display = ('id', 'owner', 'format', 'created_at', 'file_path')
    list_filter = ('format', 'owner')
    filter_horizontal = ('shared_with',)
