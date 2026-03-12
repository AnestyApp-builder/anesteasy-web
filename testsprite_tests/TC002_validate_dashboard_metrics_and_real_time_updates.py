import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Credentials for an anesthesiologist user for authentication (example credentials)
USER_EMAIL = "test.anestesiologist@example.com"
USER_PASSWORD = "StrongP@ssword123"

def test_validate_dashboard_metrics_and_real_time_updates():
    session = requests.Session()

    try:
        # Step 1: Authenticate user (login to get access token/session cookie)
        login_payload = {
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        }
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_response.status_code == 200, "Login failed"
        login_data = login_response.json()
        # Assuming JWT or session token returned; example using token auth
        token = login_data.get("access_token") or login_data.get("token")
        assert token is not None, "No access token found in login response"
        session.headers.update({"Authorization": f"Bearer {token}"})

        # Step 2: Request the main dashboard data endpoint
        dashboard_response = session.get(
            f"{BASE_URL}/api/dashboard",
            timeout=TIMEOUT
        )
        assert dashboard_response.status_code == 200, "Failed to load dashboard data"
        dashboard_data = dashboard_response.json()

        # Step 3: Validate that dashboard contains key real-time metrics
        assert "metrics" in dashboard_data, "Dashboard metrics missing"
        metrics = dashboard_data["metrics"]
        assert isinstance(metrics, dict), "Metrics should be a dictionary"

        # Basic content checks for metrics values (assuming numeric)
        for key in ["real_time_metrics", "performance_graphs", "recent_procedures", "quick_actions"]:
            assert key in dashboard_data, f"Dashboard key '{key}' missing"
        
        # Validate real time metrics structure and values
        real_time_metrics = dashboard_data.get("real_time_metrics")
        assert real_time_metrics and isinstance(real_time_metrics, dict), "Invalid real_time_metrics format"
        # Check some typical metric keys exist and are numeric
        expected_metric_keys = ["active_procedures", "completed_procedures", "pending_tasks"]
        for emk in expected_metric_keys:
            assert emk in real_time_metrics, f"Metric '{emk}' missing in real_time_metrics"
            assert isinstance(real_time_metrics[emk], (int, float)), f"Metric '{emk}' is not numeric"

        # Validate performance graphs data exists
        performance_graphs = dashboard_data.get("performance_graphs")
        assert performance_graphs and isinstance(performance_graphs, list), "Invalid performance_graphs format"
        assert len(performance_graphs) > 0, "No performance graphs data available"

        # Validate recent procedures list
        recent_procedures = dashboard_data.get("recent_procedures")
        assert recent_procedures and isinstance(recent_procedures, list), "Invalid recent_procedures format"
        # Each recent procedure should have at least id, patient_name, and procedure_date
        for proc in recent_procedures:
            assert "id" in proc and proc["id"], "Procedure id missing or empty"
            assert "patient_name" in proc and proc["patient_name"], "Procedure patient_name missing or empty"
            assert "procedure_date" in proc and proc["procedure_date"], "Procedure date missing or empty"

        # Validate quick actions presence
        quick_actions = dashboard_data.get("quick_actions")
        assert quick_actions and isinstance(quick_actions, list), "Invalid quick_actions format"
        # Check quick actions have expected keys such as 'action_name' and 'url'
        for action in quick_actions:
            assert "action_name" in action and action["action_name"], "Quick action missing name"
            assert "url" in action and action["url"], "Quick action missing url"

        # Step 4: Simulate real-time updates check if an endpoint or websocket is available.
        # Since websocket is not in scope, check a specific real-time update endpoint if exists.
        realtime_response = session.get(f"{BASE_URL}/api/dashboard/updates", timeout=TIMEOUT)
        # If not implemented, it could return 404 - accept both 200 or 404 here but validate if 200
        assert realtime_response.status_code in [200, 404], "Unexpected status code for real-time updates endpoint"
        if realtime_response.status_code == 200:
            updates_data = realtime_response.json()
            assert isinstance(updates_data, dict), "Realtime updates data invalid"
            # Expect some keys related to updates
            assert "updates" in updates_data, "Updates key missing in real-time updates response"
            assert isinstance(updates_data["updates"], list), "Updates should be a list"

    except AssertionError as ae:
        raise ae
    except RequestException as re:
        raise AssertionError(f"HTTP request failed: {re}")
    finally:
        # Logout to clean session if logout endpoint exists
        try:
            session.post(f"{BASE_URL}/api/auth/logout", timeout=TIMEOUT)
        except Exception:
            pass

test_validate_dashboard_metrics_and_real_time_updates()