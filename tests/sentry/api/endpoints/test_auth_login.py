from django.core.urlresolvers import reverse
from exam import fixture

from sentry.testutils import APITestCase
from sentry.utils.compat.mock import patch


class AuthLoginEndpointTest(APITestCase):
    @fixture
    def path(self):
        return reverse("sentry-api-0-auth-login")

    def setUp(self):
        # Requests to set the test cookie
        self.client.get(reverse("sentry-api-0-auth-config"))

    def test_login_invalid_password(self):
        resp = self.client.post(self.path, {"username": self.user.username, "password": "bizbar"})
        assert resp.status_code == 400
        assert resp.data["errors"]["__all__"] == [
            "Please enter a correct username and password. Note that both fields may be case-sensitive."
        ]

    def test_login_valid_credentials(self):
        resp = self.client.post(self.path, {"username": self.user.username, "password": "admin"})

        assert resp.status_code == 200
        assert resp.data["nextUri"] == "/organizations/new/"

    def test_must_reactivate(self):
        self.user.update(is_active=False)

        resp = self.client.post(self.path, {"username": self.user.username, "password": "admin"})

        assert resp.status_code == 200
        assert resp.data["nextUri"] == "/auth/reactivate/"

    @patch(
        "sentry.api.endpoints.auth_login.ratelimiter.is_limited", autospec=True, return_value=True
    )
    def test_login_ratelimit(self, is_limited):
        resp = self.client.post(self.path, {"username": self.user.username, "password": "admin"})

        assert resp.status_code == 400
        assert [str(s) for s in resp.data["errors"]["__all__"]] == [
            "You have made too many failed authentication attempts. Please try again later."
        ]
