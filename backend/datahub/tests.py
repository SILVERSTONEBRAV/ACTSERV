from django.test import TestCase
from django.contrib.auth.models import User
from connectors.models import DatabaseConnection
from .models import ProcessedDataRow, DataFile

class DataHubTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.db_conn = DatabaseConnection.objects.create(
            name='Test DB', db_type='POSTGRES', host='localhost', port=5432, username='u', password='p', database_name='d'
        )
        
    def test_dual_storage_models(self):
        # DB Record validation test
        row = ProcessedDataRow.objects.create(
            source_connection=self.db_conn,
            payload={"id": 1, "test": "data"}
        )
        self.assertEqual(row.payload['test'], 'data')
        
        # File Record validation
        file = DataFile.objects.create(
            owner=self.user,
            file_path='/tmp/test.json',
            format='JSON',
            source_metadata={'source': 'Test DB'}
        )
        self.assertEqual(file.owner.username, 'testuser')
