import requests
import uuid
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Placeholder credentials and headers for authentication.
# In a real scenario, these should be securely obtained and managed.
AUTH_EMAIL = "testuser@example.com"
AUTH_PASSWORD = "StrongPassword123!"
HEADERS = {
    "Content-Type": "application/json"
}

def authenticate():
    # Login to get auth token
    login_payload = {
        "email": AUTH_EMAIL,
        "password": AUTH_PASSWORD
    }
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload, timeout=TIMEOUT, headers=HEADERS)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    auth_data = login_resp.json()
    token = auth_data.get("access_token")
    assert token, "No access token received on login."

    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def test_subscription_management_and_pagarme_integration():
    headers = authenticate()

    # Step 1: Retrieve available subscription plans
    plans_resp = requests.get(f"{BASE_URL}/api/pagarme/plans", headers=headers, timeout=TIMEOUT)
    assert plans_resp.status_code == 200, f"Failed to get plans: {plans_resp.text}"
    plans_data = plans_resp.json()
    assert isinstance(plans_data, list) and len(plans_data) > 0, "No plans found in response."
    selected_plan = plans_data[0]
    plan_id = selected_plan.get("id")
    assert plan_id, "Selected plan does not have an ID."

    subscription_id = None
    try:
        # Step 2: Create a subscription for the selected plan
        create_sub_payload = {
            "plan_id": plan_id,
            "payment_method": "credit_card",
            "card_details": {
                "number": "4111111111111111",
                "holder_name": "Test User",
                "exp_month": "12",
                "exp_year": "2030",
                "cvv": "123"
            },
            "customer": {
                "email": AUTH_EMAIL,
                "name": "Test User"
            }
        }
        create_sub_resp = requests.post(f"{BASE_URL}/api/pagarme/create-subscription", json=create_sub_payload, headers=headers, timeout=TIMEOUT)
        assert create_sub_resp.status_code in (200, 201), f"Subscription creation failed: {create_sub_resp.text}"
        sub_data = create_sub_resp.json()
        subscription_id = sub_data.get("id")
        assert subscription_id, "Subscription creation response missing subscription ID."

        # Step 3: Simulate checkout and payment processing status polling
        # Poll subscription status a few times to check for payment processing updates
        status = None
        for _ in range(5):
            get_sub_resp = requests.get(f"{BASE_URL}/api/pagarme/subscription/{subscription_id}", headers=headers, timeout=TIMEOUT)
            assert get_sub_resp.status_code == 200, f"Failed to get subscription status: {get_sub_resp.text}"
            sub_status_data = get_sub_resp.json()
            status = sub_status_data.get("status")
            if status in ("active", "paid"):
                break
            time.sleep(3)
        assert status in ("active", "paid"), f"Subscription status was not active or paid after polling, got: {status}"

        # Step 4: Simulate Pagar.me webhook for payment update
        webhook_payload = {
            "event": "subscription_payment.updated",
            "subscription": {
                "id": subscription_id,
                "status": "paid"
            },
            "transaction": {
                "id": str(uuid.uuid4()),
                "status": "paid",
                "amount": 9999,
                "payment_method": "credit_card"
            }
        }
        webhook_resp = requests.post(f"{BASE_URL}/api/webhooks/pagarme", json=webhook_payload, timeout=TIMEOUT)
        assert webhook_resp.status_code in (200, 204), f"Webhook handling failed: {webhook_resp.text}"

        # Step 5: Verify that subscription status is updated after webhook
        post_webhook_resp = requests.get(f"{BASE_URL}/api/pagarme/subscription/{subscription_id}", headers=headers, timeout=TIMEOUT)
        assert post_webhook_resp.status_code == 200, f"Failed to get subscription status post webhook: {post_webhook_resp.text}"
        post_webhook_data = post_webhook_resp.json()
        post_webhook_status = post_webhook_data.get("status")
        assert post_webhook_status == "paid", f"Subscription status not updated to paid after webhook, got: {post_webhook_status}"

    finally:
        # Cleanup: Delete created subscription to avoid residue data
        if subscription_id:
            del_resp = requests.delete(f"{BASE_URL}/api/pagarme/subscription/{subscription_id}", headers=headers, timeout=TIMEOUT)
            assert del_resp.status_code in (200, 204), f"Failed to delete subscription: {del_resp.text}"

test_subscription_management_and_pagarme_integration()
