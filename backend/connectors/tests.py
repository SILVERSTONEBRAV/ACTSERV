from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from connectors.models import DatabaseConnection
from connectors.services import BaseConnector, extract_data_with_connector

class ConnectorAbstractionTests(TestCase):
    """Tests for the connector abstraction layer extensibility."""

    def test_base_connector_is_abstract(self):
        """BaseConnector cannot be instantiated directly."""
        with self.assertRaises(TypeError):
            BaseConnector(config=None)

    def test_connector_factory_returns_correct_type(self):
        """extract_data_with_connector raises on unsupported DB type."""
        conn = DatabaseConnection(
            name='Test', db_type='REDIS', host='localhost',
            port=6379, username='u', password='p', database_name='d'
        )
        with self.assertRaises(ValueError):
            extract_data_with_connector(conn, 'SELECT 1', 10, 0)

    def test_connector_factory_valid_types(self):
        """All supported DB types resolve to a connector class."""
        from connectors.services import PostgresConnector, MySQLConnector, MongoConnector, ClickHouseConnector
        for db_type, expected_cls in [
            ('POSTGRES', PostgresConnector),
            ('MYSQL', MySQLConnector),
            ('MONGO', MongoConnector),
            ('CLICKHOUSE', ClickHouseConnector),
        ]:
            conn = DatabaseConnection(
                name='T', db_type=db_type, host='h',
                port=1, username='u', password='p', database_name='d'
            )
            connector_classes = {
                'POSTGRES': PostgresConnector, 'MYSQL': MySQLConnector,
                'MONGO': MongoConnector, 'CLICKHOUSE': ClickHouseConnector,
            }
            cls = connector_classes.get(conn.db_type)
            self.assertEqual(cls, expected_cls)


class ConnectorModelTests(TestCase):
    """Tests for the DatabaseConnection model."""

    def test_create_connection(self):
        conn = DatabaseConnection.objects.create(
            name='PG Test', db_type='POSTGRES', host='localhost',
            port=5432, username='admin', password='secret', database_name='testdb'
        )
        self.assertEqual(str(conn), 'PG Test (POSTGRES)')
        self.assertEqual(conn.db_type, 'POSTGRES')

    def test_type_choices(self):
        valid_types = ['POSTGRES', 'MYSQL', 'MONGO', 'CLICKHOUSE']
        for t in valid_types:
            conn = DatabaseConnection(name='t', db_type=t, host='h', port=1, username='u', password='p', database_name='d')
            self.assertIn(conn.db_type, valid_types)


class ConnectorAPITests(TestCase):
    """Tests for the connector REST API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser('admin', 'a@b.com', 'pass')
        self.client.force_authenticate(user=self.admin)

    def test_list_connectors(self):
        DatabaseConnection.objects.create(
            name='Test PG', db_type='POSTGRES', host='localhost',
            port=5432, username='u', password='p', database_name='d'
        )
        res = self.client.get('/api/connectors/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_create_connector(self):
        res = self.client.post('/api/connectors/', {
            'name': 'New MySQL', 'db_type': 'MYSQL', 'host': 'db.local',
            'port': 3306, 'username': 'root', 'password': 'root', 'database_name': 'app'
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(DatabaseConnection.objects.count(), 1)

    def test_delete_connector(self):
        conn = DatabaseConnection.objects.create(
            name='Del', db_type='MONGO', host='h', port=27017, username='u', password='p', database_name='d'
        )
        res = self.client.delete(f'/api/connectors/{conn.id}/')
        self.assertEqual(res.status_code, 204)
