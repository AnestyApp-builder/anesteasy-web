import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Credentials for a test secretary user (should be valid in test environment)
SECRETARY_CREDENTIALS = {
    "email": "secretaria.teste@anesteasy.com",
    "password": "SenhaSegura123!"
}

def test_tc007_validate_secretaries_system_with_permissions_and_notifications():
    session = requests.Session()
    try:
        # 1. Login as Secretary
        login_url = f"{BASE_URL}/api/auth/login"
        login_payload = {
            "email": SECRETARY_CREDENTIALS["email"],
            "password": SECRETARY_CREDENTIALS["password"]
        }
        login_resp = session.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "token" in login_data, "Auth token missing in login response"
        token = login_data["token"]

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # 2. Access Secretary Dashboard
        dashboard_url = f"{BASE_URL}/api/secretaria/dashboard"
        dashboard_resp = session.get(dashboard_url, headers=headers, timeout=TIMEOUT)
        assert dashboard_resp.status_code == 200, f"Dashboard access failed: {dashboard_resp.text}"
        dashboard_data = dashboard_resp.json()
        # Check for expected keys in dashboard response
        assert "metrics" in dashboard_data, "Metrics missing in dashboard data"
        assert "notifications" in dashboard_data, "Notifications missing in dashboard data"

        # 3. List Procedures Linked to Secretary’s Anesthesiologists
        procedures_url = f"{BASE_URL}/api/secretaria/procedimentos"
        procedures_resp = session.get(procedures_url, headers=headers, timeout=TIMEOUT)
        assert procedures_resp.status_code == 200, f"Procedure list failed: {procedures_resp.text}"
        procedures_list = procedures_resp.json()
        assert isinstance(procedures_list, list), "Procedures response is not a list"

        # 4. Create a new Procedure linked to an anesthesiologist
        # To create, we may need anesthesiologist id; assume API accepts anesthesiologistId in payload
        # Prepare new procedure data (minimal required)
        new_procedure_payload = {
            "title": "Teste Procedimento Secretária",
            "description": "Procedimento teste criado pela secretária para validação",
            "linkedAnesthesiologistId": None  # This needs to be fetched or assigned from available data
        }

        # Fetch linked anesthesiologists to pick one for linking
        anesthesiologists_url = f"{BASE_URL}/api/secretaria/anestesiologistas"
        anesth_resp = session.get(anesthesiologists_url, headers=headers, timeout=TIMEOUT)
        assert anesth_resp.status_code == 200, f"Fetching anesthesiologists failed: {anesth_resp.text}"
        anesth_list = anesth_resp.json()
        assert isinstance(anesth_list, list) and len(anesth_list) > 0, "No anesthesiologists linked found"
        new_procedure_payload["linkedAnesthesiologistId"] = anesth_list[0]["id"]

        # Create procedure
        create_proc_url = f"{BASE_URL}/api/secretaria/procedimentos"
        create_proc_resp = session.post(create_proc_url, headers=headers, json=new_procedure_payload, timeout=TIMEOUT)
        assert create_proc_resp.status_code == 201, f"Procedure creation failed: {create_proc_resp.text}"
        created_proc = create_proc_resp.json()
        proc_id = created_proc.get("id")
        assert proc_id is not None, "Created procedure ID is missing"

        # 5. Validate permission enforcement: attempt to access procedure that secretary should not have permission for
        # For that, we try to fetch a procedure with a random or invalid id
        invalid_proc_id = "00000000-0000-0000-0000-000000000000"
        get_invalid_proc_url = f"{BASE_URL}/api/secretaria/procedimentos/{invalid_proc_id}"
        invalid_proc_resp = session.get(get_invalid_proc_url, headers=headers, timeout=TIMEOUT)
        # Expect 403 Forbidden or 404 Not Found
        assert invalid_proc_resp.status_code in (403, 404), "Permission enforcement failed: unauthorized access granted"

        # 6. Check notifications delivery: list notifications
        notifications_url = f"{BASE_URL}/api/secretaria/notificacoes"
        notifications_resp = session.get(notifications_url, headers=headers, timeout=TIMEOUT)
        assert notifications_resp.status_code == 200, f"Fetching notifications failed: {notifications_resp.text}"
        notifications = notifications_resp.json()
        assert isinstance(notifications, list), "Notifications response is not a list"

        # 7. Validate that newly created procedure triggers a notification (assumed system behavior)
        # Normally, a notification could be pushed; here, we re-fetch notifications to confirm presence
        # Since exact notification contents unknown, check at least one notification with procedure id reference
        notification_found = any(
            proc_id in (notif.get("relatedResourceId") or "")
            for notif in notifications
        )
        assert notification_found, "No notification associated with newly created procedure found"

    except RequestException as e:
        assert False, f"HTTP request failed: {e}"
    finally:
        # Cleanup: delete created procedure if it exists
        if 'proc_id' in locals():
            try:
                delete_proc_url = f"{BASE_URL}/api/secretaria/procedimentos/{proc_id}"
                delete_resp = session.delete(delete_proc_url, headers=headers, timeout=TIMEOUT)
                assert delete_resp.status_code in (200, 204), f"Failed to delete procedure: {delete_resp.text}"
            except Exception:
                pass


test_tc007_validate_secretaries_system_with_permissions_and_notifications()
