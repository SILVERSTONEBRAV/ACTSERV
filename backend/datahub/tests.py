import os
import json
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from connectors.models import DatabaseConnection
from .models import ProcessedDataRow, DataFile

TEST_EXPORTS_DIR = os.path.join(os.path.dirname(__file__), 'test_exports')


class DataHubModelTests(TestCase):
    """Tests for the core data models."""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.db_conn = DatabaseConnection.objects.create(
            name='Test DB', db_type='POSTGRES', host='localhost', port=5432,
            username='u', password='p', database_name='d'
        )

    def test_processed_data_row_creation(self):
        row = ProcessedDataRow.objects.create(
            source_connection=self.db_conn,
            payload={"id": 1, "test": "data"}
        )
        self.assertEqual(row.payload['test'], 'data')
        self.assertIsNotNone(row.processed_at)

    def test_data_file_creation(self):
        file = DataFile.objects.create(
            owner=self.user,
            file_path='/tmp/test.json',
            format='JSON',
            source_metadata={'source': 'Test DB'}
        )
        self.assertEqual(file.owner.username, 'testuser')
        self.assertEqual(file.status, 'SUCCESS')
        self.assertEqual(file.extraction_time_ms, 0)

    def test_data_file_sharing(self):
        other = User.objects.create_user(username='other', password='pass')
        file = DataFile.objects.create(
            owner=self.user,
            file_path='/tmp/shared.json',
            format='JSON',
            source_metadata={}
        )
        file.shared_with.add(other)
        self.assertIn(other, file.shared_with.all())


@override_settings(DATA_EXPORTS_DIR=TEST_EXPORTS_DIR)
class DualStorageSubmitTests(TestCase):
    """Tests for the POST /api/datahub/submit/ endpoint — dual storage."""

    def setUp(self):
        os.makedirs(TEST_EXPORTS_DIR, exist_ok=True)
        self.client = APIClient()
        self.admin = User.objects.create_superuser('admin', 'a@b.com', 'adminpass')
        self.client.force_authenticate(user=self.admin)
        self.conn = DatabaseConnection.objects.create(
            name='TestPG', db_type='POSTGRES', host='localhost',
            port=5432, username='u', password='p', database_name='d'
        )

    def tearDown(self):
        # Clean up test export files
        if os.path.exists(TEST_EXPORTS_DIR):
            for f in os.listdir(TEST_EXPORTS_DIR):
                os.remove(os.path.join(TEST_EXPORTS_DIR, f))

    def test_submit_creates_db_records(self):
        """Submitting rows should create ProcessedDataRow entries in DB."""
        res = self.client.post('/api/datahub/submit/', {
            'connection_id': self.conn.id,
            'rows': [{"name": "Alice"}, {"name": "Bob"}],
            'format': 'JSON'
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['success'])
        self.assertEqual(ProcessedDataRow.objects.count(), 2)

    def test_submit_creates_file(self):
        """Submitting rows should create an export file on disk."""
        res = self.client.post('/api/datahub/submit/', {
            'connection_id': self.conn.id,
            'rows': [{"col": "value"}],
            'format': 'JSON'
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(DataFile.objects.count(), 1)
        data_file = DataFile.objects.first()
        self.assertTrue(os.path.exists(data_file.file_path))
        # Verify file content has metadata
        with open(data_file.file_path, 'r') as f:
            content = json.load(f)
        self.assertIn('metadata', content)
        self.assertIn('timestamp', content['metadata'])
        self.assertIn('source_db_name', content['metadata'])

    def test_submit_csv_format(self):
        """Submitting with CSV format should create a .csv file."""
        res = self.client.post('/api/datahub/submit/', {
            'connection_id': self.conn.id,
            'rows': [{"x": "1", "y": "2"}],
            'format': 'CSV'
        }, format='json')
        self.assertEqual(res.status_code, 200)
        data_file = DataFile.objects.first()
        self.assertTrue(data_file.file_path.endswith('.csv'))

    def test_submit_records_telemetry(self):
        """Submit should populate extraction_time_ms and file_size_bytes."""
        self.client.post('/api/datahub/submit/', {
            'connection_id': self.conn.id,
            'rows': [{"a": "b"}],
            'format': 'JSON'
        }, format='json')
        data_file = DataFile.objects.first()
        self.assertGreater(data_file.extraction_time_ms, 0)
        self.assertGreater(data_file.file_size_bytes, 0)


@override_settings(DATA_EXPORTS_DIR=TEST_EXPORTS_DIR)
class ValidationTests(TestCase):
    """Tests for backend data validation on submit."""

    def setUp(self):
        os.makedirs(TEST_EXPORTS_DIR, exist_ok=True)
        self.client = APIClient()
        self.admin = User.objects.create_superuser('admin', 'a@b.com', 'pass')
        self.client.force_authenticate(user=self.admin)
        self.conn = DatabaseConnection.objects.create(
            name='V', db_type='MYSQL', host='h', port=3306,
            username='u', password='p', database_name='d'
        )

    def test_empty_rows_rejected(self):
        """Submitting with no rows should return 400."""
        res = self.client.post('/api/datahub/submit/', {
            'connection_id': self.conn.id,
            'rows': [],
            'format': 'JSON'
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('error', res.data)

    def test_invalid_row_rejected(self):
        """Submitting a row that is an empty dict should return 400."""
        res = self.client.post('/api/datahub/submit/', {
            'connection_id': self.conn.id,
            'rows': [{}],
            'format': 'JSON'
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_missing_connection_rejected(self):
        """Submitting with a nonexistent connection_id should return 400."""
        res = self.client.post('/api/datahub/submit/', {
            'connection_id': 99999,
            'rows': [{"a": "b"}],
            'format': 'JSON'
        }, format='json')
        self.assertEqual(res.status_code, 400)


class RBACFileAccessTests(TestCase):
    """Tests for role-based access control on the files endpoint."""

    def setUp(self):
        self.admin = User.objects.create_superuser('admin', 'a@b.com', 'pass')
        self.user_a = User.objects.create_user('user_a', 'a@x.com', 'pass')
        self.user_b = User.objects.create_user('user_b', 'b@x.com', 'pass')

        # user_a owns file1, user_b owns file2
        self.file1 = DataFile.objects.create(
            owner=self.user_a, file_path='/tmp/a.json', format='JSON', source_metadata={}
        )
        self.file2 = DataFile.objects.create(
            owner=self.user_b, file_path='/tmp/b.json', format='JSON', source_metadata={}
        )

    def test_admin_sees_all_files(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)
        res = client.get('/api/files/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)

    def test_user_sees_only_own_files(self):
        client = APIClient()
        client.force_authenticate(user=self.user_a)
        res = client.get('/api/files/')
        self.assertEqual(res.status_code, 200)
        ids = [f['id'] for f in res.data]
        self.assertIn(self.file1.id, ids)
        self.assertNotIn(self.file2.id, ids)

    def test_user_sees_shared_files(self):
        self.file2.shared_with.add(self.user_a)
        client = APIClient()
        client.force_authenticate(user=self.user_a)
        res = client.get('/api/files/')
        ids = [f['id'] for f in res.data]
        self.assertIn(self.file1.id, ids)
        self.assertIn(self.file2.id, ids)

    def test_unauthenticated_blocked(self):
        client = APIClient()
        res = client.get('/api/files/')
        self.assertEqual(res.status_code, 401)
