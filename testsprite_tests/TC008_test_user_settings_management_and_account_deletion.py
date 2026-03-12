import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Test user credentials and initial data for registration and login
TEST_USER_EMAIL = "testuser@example.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_USER_PROFILE_UPDATE = {
    "full_name": "Test User Updated",
    "phone": "+5511999999999",
    "bio": "Updated bio for testing user settings."
}
TEST_USER_SYSTEM_PREFERENCES = {
    "notifications": True,
    "theme": "dark",
    "language": "pt-BR"
}

def test_user_settings_management_and_account_deletion():
    session = requests.Session()
    try:
        # 1. Register user (anesthesiologist)
        register_payload = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "role": "anesthesiologist"
        }
        resp = session.post(f"{BASE_URL}/api/auth/register", json=register_payload, timeout=TIMEOUT)
        assert resp.status_code == 201 or resp.status_code == 200, f"Registration failed: {resp.text}"

        # 2. Confirm Email (assuming API to confirm email token simulation)
        # Since the PRD says confirmation, but no endpoint given, try typical confirm endpoint with token from response or skip if not available
        # Assuming registration returns a confirmation token for testing purposes:
        confirm_token = resp.json().get("confirmation_token")
        if confirm_token:
            resp_confirm = session.post(f"{BASE_URL}/api/auth/confirm", json={"token": confirm_token}, timeout=TIMEOUT)
            assert resp_confirm.status_code == 200, f"Email confirmation failed: {resp_confirm.text}"

        # 3. Login user
        login_payload = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        resp_login = session.post(f"{BASE_URL}/api/auth/login", json=login_payload, timeout=TIMEOUT)
        assert resp_login.status_code == 200, f"Login failed: {resp_login.text}"
        auth_data = resp_login.json()
        access_token = auth_data.get("access_token")
        refresh_token = auth_data.get("refresh_token")
        assert access_token, "No access token returned on login"

        # Set auth header for future requests
        session.headers.update({"Authorization": f"Bearer {access_token}"})

        # 4. Access and update user profile settings
        # GET current profile
        resp_profile_get = session.get(f"{BASE_URL}/api/user/profile", timeout=TIMEOUT)
        assert resp_profile_get.status_code == 200, f"Failed to get user profile: {resp_profile_get.text}"
        profile = resp_profile_get.json()
        assert "email" in profile and profile["email"] == TEST_USER_EMAIL, "Profile email mismatch"

        # PUT update profile
        resp_profile_update = session.put(f"{BASE_URL}/api/user/profile", json=TEST_USER_PROFILE_UPDATE, timeout=TIMEOUT)
        assert resp_profile_update.status_code in (200, 204), f"Failed to update profile: {resp_profile_update.text}"

        # Verify update
        resp_profile_get2 = session.get(f"{BASE_URL}/api/user/profile", timeout=TIMEOUT)
        assert resp_profile_get2.status_code == 200, f"Failed to get updated profile: {resp_profile_get2.text}"
        updated_profile = resp_profile_get2.json()
        assert updated_profile.get("full_name") == TEST_USER_PROFILE_UPDATE["full_name"], "Full name update failed"
        assert updated_profile.get("phone") == TEST_USER_PROFILE_UPDATE["phone"], "Phone update failed"
        assert updated_profile.get("bio") == TEST_USER_PROFILE_UPDATE["bio"], "Bio update failed"

        # 5. Update system preferences
        resp_preferences_update = session.put(f"{BASE_URL}/api/user/preferences", json=TEST_USER_SYSTEM_PREFERENCES, timeout=TIMEOUT)
        assert resp_preferences_update.status_code in (200, 204), f"Failed to update system preferences: {resp_preferences_update.text}"

        # Verify preferences update
        resp_preferences_get = session.get(f"{BASE_URL}/api/user/preferences", timeout=TIMEOUT)
        assert resp_preferences_get.status_code == 200, f"Failed to get system preferences: {resp_preferences_get.text}"
        prefs = resp_preferences_get.json()
        for key, val in TEST_USER_SYSTEM_PREFERENCES.items():
            assert prefs.get(key) == val, f"Preference {key} update mismatch"

        # 6. Secure account deletion
        # Usually requires current password confirmation
        deletion_payload = {"password": TEST_USER_PASSWORD}
        resp_delete = session.delete(f"{BASE_URL}/api/user/account", json=deletion_payload, timeout=TIMEOUT)
        assert resp_delete.status_code in (200, 204), f"Account deletion failed: {resp_delete.text}"

        # 7. Verify user cannot login after deletion
        resp_login_after_delete = session.post(f"{BASE_URL}/api/auth/login", json=login_payload, timeout=TIMEOUT)
        assert resp_login_after_delete.status_code == 401 or resp_login_after_delete.status_code == 400, "Deleted user was able to login"

    except RequestException as e:
        assert False, f"Request failed: {e}"
    finally:
        # Cleanup: attempt to delete user if still exists (idempotent if already deleted)
        try:
            # Try login to see if user exists before deleting forcibly
            resp_check = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}, timeout=TIMEOUT)
            if resp_check.status_code == 200:
                token = resp_check.json().get("access_token")
                if token:
                    headers = {"Authorization": f"Bearer {token}"}
                    requests.delete(f"{BASE_URL}/api/user/account", json={"password": TEST_USER_PASSWORD}, headers=headers, timeout=TIMEOUT)
        except Exception:
            pass

test_user_settings_management_and_account_deletion()