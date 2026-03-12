import requests
import json

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Replace with valid credentials for an authenticated user (anesthesiologist or secretaria)
AUTH_EMAIL = "testuser@anesteasy.com"
AUTH_PASSWORD = "SecurePass123!"

def authenticate(email, password):
    login_url = f"{BASE_URL}/api/auth/login"
    try:
        resp = requests.post(
            login_url,
            json={"email": email, "password": password},
            timeout=TIMEOUT
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("access_token") or data.get("token") or data.get("accessToken")
        assert token, "Authentication token not found in login response"
        return token
    except Exception as e:
        raise RuntimeError(f"Authentication failed: {e}")

def test_TC005_verify_customizable_report_generation_and_export():
    # Authenticate and obtain token
    token = authenticate(AUTH_EMAIL, AUTH_PASSWORD)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    report_endpoint = f"{BASE_URL}/api/relatorios"
    export_pdf_endpoint = f"{report_endpoint}/export/pdf"
    export_csv_endpoint = f"{report_endpoint}/export/csv"

    # Define sample filters for the customizable report
    filters = {
        "dateRange": {"start": "2025-01-01", "end": "2025-12-31"},
        "procedureType": ["anestesia geral", "raquidiana"],
        "status": ["concluido", "pendente"],
        "secretaryId": None  # Assuming can filter by secretary or leave null for all
    }

    # Step 1: Generate detailed customizable report with filters
    try:
        response = requests.post(report_endpoint, headers=headers, json=filters, timeout=TIMEOUT)
        response.raise_for_status()
        report_data = response.json()
        assert isinstance(report_data, dict) or isinstance(report_data, list), "Report response is not JSON object or list"
        assert len(report_data) > 0, "Report data is empty"
        # Check that filtered data corresponds to filters (basic validation)
        # e.g. check entries have required fields
        sample_entry = report_data[0] if isinstance(report_data, list) else next(iter(report_data.values()), None)
        assert sample_entry is not None, "Sample report entry is None"
        required_fields = ["procedureId", "date", "type", "status", "amount"]
        for field in required_fields:
            assert field in sample_entry, f"Field '{field}' missing in report entry"
    except requests.HTTPError as e:
        assert False, f"Report generation request failed with HTTP error: {e}"
    except Exception as e:
        assert False, f"Failed during report generation validation: {e}"

    # Step 2: Export report data as PDF
    try:
        pdf_resp = requests.post(export_pdf_endpoint, headers=headers, json=filters, timeout=TIMEOUT)
        pdf_resp.raise_for_status()
        content_type = pdf_resp.headers.get("Content-Type", "")
        assert "application/pdf" in content_type.lower(), f"PDF export response Content-Type is not PDF: {content_type}"
        assert pdf_resp.content and len(pdf_resp.content) > 100, "PDF export response content is empty or too small"
    except requests.HTTPError as e:
        assert False, f"PDF export request failed with HTTP error: {e}"
    except Exception as e:
        assert False, f"Failed during PDF export validation: {e}"

    # Step 3: Export report data as CSV
    try:
        csv_resp = requests.post(export_csv_endpoint, headers=headers, json=filters, timeout=TIMEOUT)
        csv_resp.raise_for_status()
        content_type = csv_resp.headers.get("Content-Type", "")
        assert "text/csv" in content_type.lower() or "application/csv" in content_type.lower(), f"CSV export response Content-Type is not CSV: {content_type}"
        content = csv_resp.content.decode("utf-8")
        assert "procedureId" in content and "date" in content, "CSV export content missing expected headers"
        lines = content.strip().splitlines()
        assert len(lines) > 1, "CSV export content has no data rows"
    except requests.HTTPError as e:
        assert False, f"CSV export request failed with HTTP error: {e}"
    except Exception as e:
        assert False, f"Failed during CSV export validation: {e}"

test_TC005_verify_customizable_report_generation_and_export()