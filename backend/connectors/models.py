from django.db import models

class DatabaseConnection(models.Model):
    TYPE_CHOICES = (
        ('POSTGRES', 'PostgreSQL'),
        ('MYSQL', 'MySQL'),
        ('MONGO', 'MongoDB'),
        ('CLICKHOUSE', 'ClickHouse'),
    )
    name = models.CharField(max_length=255)
    db_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    host = models.CharField(max_length=255)
    port = models.IntegerField()
    username = models.CharField(max_length=255)
    password = models.CharField(max_length=255) # In real app, encrypt this
    database_name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.name} ({self.db_type})"
