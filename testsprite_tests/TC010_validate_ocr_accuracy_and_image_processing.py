import requests
import base64

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_validate_ocr_accuracy_and_image_processing():
    """
    Test OCR accuracy and image processing endpoint for medical label data capture.
    Assumes API endpoint POST /api/ocr accepts image in base64 and returns extracted data fields.
    """
    ocr_endpoint = f"{BASE_URL}/api/ocr"
    # Sample base64 encoded image data of a medical label for testing.
    # In a real scenario, replace this string with a valid base64 encoded sample image of a medical label.
    sample_image_base64 = (
        "iVBORw0KGgoAAAANSUhEUgAAAKAAAABwCAYAAADYYPoRAAAACXBIWXMAAAsTAAALEwEAmpwYAAAC"
        "DklEQVR4nO3QwUoDQRRF0d0ga6mh06mGxo7kmMYUmI4FEy1ELsAusIvohFoxJKSElJLnHx3vF2Tn"
        "6X9cn+39uGPeAAB9cCHb04AAAz68mmXbDIpOl6ENyVsU5APCEDbXTEB2h/v9UwBAVvF6FTQsz0Nv"
        "a75cgqG+PbqX0aOeYHqJzHlD5bVZxl68bZmH7DLppsOYIKYLPLkWNhS/yYHVABjseqfQ2ByjR6qN"
        "YnPwxS+cVpSdQKFzCykR9NkLgs6Y9sf0nqG3tgKBVflpR+Fwn1eAYRCOELuTw/ltwn8x/nEuzDsJ"
        "xvCCPF+OxgK60zx4jhKUgJ9BKBaQKwLOhFQIOp404O6xn6Hm/uQDzT4IEAV8AiZBKb/yW8QSTChL"
        "LAEWcLdFB7gRDujGC1A6faPVrP1AwJFcKd/Nr+sSnR7QrCnTnGSjpqqv3lzA6N9KHv+muaogBLL7"
        "DSAQu4zHCAfvx5a4qF8v8AAAAASUVORK5CYII="
    )

    headers = {
        "Content-Type": "application/json",
        # Add auth headers here if authentication is required, e.g.:
        # "Authorization": "Bearer <token>"
    }

    payload = {
        "image_base64": sample_image_base64,
        "processing_options": {
            "language": "por",       # Portuguese, assuming medical labels in Portuguese
            "ocr_engine": "tesseract",
            "preprocess": True,
            "autofill": True
        }
    }

    try:
        response = requests.post(ocr_endpoint, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to OCR endpoint failed: {e}"

    assert response.status_code == 200, f"Expected 200 OK but got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate that the response contains expected fields extracted from label
    expected_fields = ["patient_name", "medication", "dose", "expiration_date"]
    for field in expected_fields:
        assert field in data, f"Missing expected field '{field}' in OCR response"
        assert data[field], f"Field '{field}' should not be empty"

    # Validate that autofill flag or processed image result exists if applicable
    assert isinstance(data.get("autofill_data"), dict), "autofill_data field missing or invalid"

    # Additionally, verify data correctness by minimal length or reasonable format check
    assert len(data["patient_name"]) > 2, "patient_name seems too short"
    assert len(data["medication"]) > 2, "medication seems too short"

test_validate_ocr_accuracy_and_image_processing()
