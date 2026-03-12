import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Placeholder user credentials - replace with valid test credentials or fixture data
USER_EMAIL = "testuser@example.com"
USER_PASSWORD = "TestPass123!"

def authenticate():
    try:
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": USER_EMAIL, "password": USER_PASSWORD},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        token = resp.json().get("access_token") or resp.json().get("token")
        assert token, "Authentication token not found in login response"
        return token
    except Exception as e:
        raise AssertionError(f"Authentication failed: {e}")

def create_financial_record(token, record_type, payload):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.post(
            f"{BASE_URL}/api/finance/{record_type}",
            json=payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        assert "id" in data, f"{record_type} creation response missing 'id'"
        return data["id"]
    except Exception as e:
        raise AssertionError(f"Failed to create {record_type}: {e}")

def delete_financial_record(token, record_type, record_id):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.delete(
            f"{BASE_URL}/api/finance/{record_type}/{record_id}",
            headers=headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
    except Exception as e:
        # Log deletion failure but do not raise to avoid test masking
        print(f"Warning: Failed to delete {record_type} {record_id}: {e}")

def test_financial_module_revenue_and_expense_tracking():
    token = authenticate()
    headers = {"Authorization": f"Bearer {token}"}

    revenue_id = None
    expense_id = None

    try:
        # Create Revenue
        revenue_payload = {
            "description": "Consultation Revenue",
            "amount": 1500.00,
            "date": "2025-12-01",
            "category": "Consultation",
            "payment_status": "paid",
            "notes": "Revenue from consultation with client X"
        }
        revenue_id = create_financial_record(token, "revenues", revenue_payload)

        # Create Expense
        expense_payload = {
            "description": "Office Supplies",
            "amount": 200.00,
            "date": "2025-12-02",
            "category": "Supplies",
            "payment_status": "pending",
            "notes": "Purchase of printer ink and paper"
        }
        expense_id = create_financial_record(token, "expenses", expense_payload)

        # Verify revenue record retrieval
        revenue_resp = requests.get(
            f"{BASE_URL}/api/finance/revenues/{revenue_id}",
            headers=headers,
            timeout=TIMEOUT,
        )
        revenue_resp.raise_for_status()
        revenue_data = revenue_resp.json()
        assert revenue_data["id"] == revenue_id
        assert revenue_data["description"] == revenue_payload["description"]
        assert float(revenue_data["amount"]) == revenue_payload["amount"]
        assert revenue_data["payment_status"] == revenue_payload["payment_status"]

        # Verify expense record retrieval
        expense_resp = requests.get(
            f"{BASE_URL}/api/finance/expenses/{expense_id}",
            headers=headers,
            timeout=TIMEOUT,
        )
        expense_resp.raise_for_status()
        expense_data = expense_resp.json()
        assert expense_data["id"] == expense_id
        assert expense_data["description"] == expense_payload["description"]
        assert float(expense_data["amount"]) == expense_payload["amount"]
        assert expense_data["payment_status"] == expense_payload["payment_status"]

        # Verify financial goals endpoint availability and response structure
        goals_resp = requests.get(
            f"{BASE_URL}/api/finance/goals",
            headers=headers,
            timeout=TIMEOUT,
        )
        goals_resp.raise_for_status()
        goals_data = goals_resp.json()
        assert isinstance(goals_data, list), "Financial goals response should be a list"

        # Verify financial performance analysis endpoint with some basic checks
        performance_resp = requests.get(
            f"{BASE_URL}/api/finance/performance",
            headers=headers,
            timeout=TIMEOUT,
        )
        performance_resp.raise_for_status()
        performance_data = performance_resp.json()
        assert "revenue_total" in performance_data
        assert "expense_total" in performance_data
        assert isinstance(performance_data["revenue_total"], (int, float))
        assert isinstance(performance_data["expense_total"], (int, float))

        # Verify payment status updates: update expense to paid
        update_payload = {"payment_status": "paid"}
        update_resp = requests.put(
            f"{BASE_URL}/api/finance/expenses/{expense_id}",
            json=update_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        update_resp.raise_for_status()
        updated_expense = update_resp.json()
        assert updated_expense["payment_status"] == "paid"

    finally:
        # Cleanup created resources
        if revenue_id:
            delete_financial_record(token, "revenues", revenue_id)
        if expense_id:
            delete_financial_record(token, "expenses", expense_id)

test_financial_module_revenue_and_expense_tracking()