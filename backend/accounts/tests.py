from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient

class AuthTests(TestCase):
    """Tests for authentication and RBAC."""

    def setUp(self):
        self.client = APIClient()

    def test_register_user(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'newuser', 'password': 'testpass', 'email': 'new@test.com'
        })
        self.assertEqual(res.status_code, 201)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_login_jwt(self):
        User.objects.create_user('testuser', 'test@test.com', 'testpass')
        res = self.client.post('/api/auth/token/', {
            'username': 'testuser', 'password': 'testpass'
        })
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)

    def test_protected_endpoint_requires_auth(self):
        res = self.client.get('/api/connectors/')
        self.assertEqual(res.status_code, 401)

    def test_authenticated_access(self):
        user = User.objects.create_user('authuser', 'a@b.com', 'pass')
        self.client.force_authenticate(user=user)
        res = self.client.get('/api/connectors/')
        self.assertEqual(res.status_code, 200)

    def test_current_user(self):
        user = User.objects.create_user('me', 'me@test.com', 'pass')
        self.client.force_authenticate(user=user)
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['username'], 'me')
