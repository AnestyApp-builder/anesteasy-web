import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_verify_user_authentication_and_email_confirmation():
    session = requests.Session()

    # Helper functions
    def register_user(email, password, role):
        payload = {
            "email": email,
            "password": password,
            "role": role
        }
        return session.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=TIMEOUT)

    def confirm_email(token):
        # Assuming the confirmation API expects token as query parameter instead of JSON body
        return session.post(f"{BASE_URL}/api/auth/confirm?token={token}", timeout=TIMEOUT)

    def login_user(email, password):
        payload = {"email": email, "password": password}
        return session.post(f"{BASE_URL}/api/auth/login", json=payload, timeout=TIMEOUT)

    def logout_user(auth_token):
        headers = {"Authorization": f"Bearer {auth_token}"}
        return session.post(f"{BASE_URL}/api/auth/logout", headers=headers, timeout=TIMEOUT)

    def request_password_reset(email):
        payload = {"email": email}
        return session.post(f"{BASE_URL}/api/auth/forgot-password", json=payload, timeout=TIMEOUT)

    def reset_password(token, new_password):
        payload = {"token": token, "new_password": new_password}
        return session.post(f"{BASE_URL}/api/auth/reset-password", json=payload, timeout=TIMEOUT)

    def access_protected_route(auth_token, route):
        headers = {"Authorization": f"Bearer {auth_token}"}
        return session.get(f"{BASE_URL}{route}", headers=headers, timeout=TIMEOUT)

    def get_confirmation_token_mock(email):
        r = session.get(f"{BASE_URL}/api/auth/test/get-confirmation-token?email={email}", timeout=TIMEOUT)
        r.raise_for_status()
        return r.json().get("token")

    def get_reset_token_mock(email):
        r = session.get(f"{BASE_URL}/api/auth/test/get-reset-token?email={email}", timeout=TIMEOUT)
        r.raise_for_status()
        return r.json().get("token")

    # Test flow starts here
    # Test for both anesthesiologist and secretary
    users = [
        {"email": "anesthesiologist_test@example.com", "password": "StrongPass123!", "role": "anesthesiologist"},
        {"email": "secretary_test@example.com", "password": "StrongPass123!", "role": "secretary"},
    ]

    created_user_tokens = []

    try:
        for user in users:
            # 1. Register User
            resp = register_user(user["email"], user["password"], user["role"])
            assert resp.status_code in [200, 201], f"Registration failed for {user['role']}"

            # 2. Confirm Email
            token = get_confirmation_token_mock(user["email"])
            assert token, f"No confirmation token found for {user['email']}"
            resp = confirm_email(token)
            assert resp.status_code == 200, f"Email confirmation failed for {user['email']}"

            # 3. Login User
            resp = login_user(user["email"], user["password"])
            assert resp.status_code == 200, f"Login failed for {user['email']}"
            auth_data = resp.json()
            auth_token = auth_data.get("access_token") or auth_data.get("token")
            assert auth_token, f"No auth token received for {user['email']}"
            created_user_tokens.append((user["email"], auth_token))

            # 4. Access protected route (dashboard)
            dashboard_route = "/dashboard" if user["role"] == "anesthesiologist" else "/secretaria/dashboard"
            resp = access_protected_route(auth_token, dashboard_route)
            assert resp.status_code == 200, f"Access to protected route failed for {user['email']}"

            # 5. Logout User
            resp = logout_user(auth_token)
            assert resp.status_code == 200, f"Logout failed for {user['email']}"

            # 6. Attempt to access protected route after logout (should fail 401/403)
            resp = access_protected_route(auth_token, dashboard_route)
            assert resp.status_code in [401, 403], f"Protected route accessible after logout for {user['email']}"

            # 7. Request password reset
            resp = request_password_reset(user["email"])
            assert resp.status_code == 200, f"Password reset request failed for {user['email']}"

            # Simulate getting reset token from mock endpoint
            reset_token = get_reset_token_mock(user["email"])
            assert reset_token, f"No reset token found for {user['email']}"

            # 8. Reset password
            new_password = "NewStrongPass123!"
            resp = reset_password(reset_token, new_password)
            assert resp.status_code == 200, f"Password reset failed for {user['email']}"

            # 9. Login with new password
            resp = login_user(user["email"], new_password)
            assert resp.status_code == 200, f"Login failed with new password for {user['email']}"
            auth_data = resp.json()
            auth_token = auth_data.get("access_token") or auth_data.get("token")
            assert auth_token, f"No auth token received after password reset for {user['email']}"

            # Update token for next operations
            created_user_tokens[-1] = (user["email"], auth_token)

            # 10. Access protected route again, should succeed
            resp = access_protected_route(auth_token, dashboard_route)
            assert resp.status_code == 200, f"Access to protected route failed after password reset for {user['email']}"

    finally:
        # Cleanup: delete users created during test with their own token.
        for email, token in created_user_tokens:
            headers = {"Authorization": f"Bearer {token}"}
            try:
                resp = session.delete(f"{BASE_URL}/api/auth/user", headers=headers, timeout=TIMEOUT)
                assert resp.status_code in [200, 204], f"Failed to delete user {email}"
            except Exception:
                pass


test_verify_user_authentication_and_email_confirmation()
