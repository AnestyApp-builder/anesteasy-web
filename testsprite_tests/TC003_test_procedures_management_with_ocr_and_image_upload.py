import requests
import io
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Dummy token for authentication bypass in testing (replace with valid token or authentication method)
DUMMY_TOKEN = "dummy-token-for-testing"

def authenticate():
    """Return dummy access token as authentication method is not defined in PRD endpoints."""
    return DUMMY_TOKEN

def test_procedures_management_with_ocr_and_image_upload():
    token = authenticate()
    headers = {"Authorization": f"Bearer {token}"}

    procedure_id = None

    try:
        # Create a new anesthetic procedure
        create_url = f"{BASE_URL}/api/procedures"
        new_procedure_payload = {
            "title": "Teste de procedimento anestésico",
            "description": "Descrição do procedimento para testes com upload e OCR.",
            "date": "2025-11-12",
            "patientName": "Paciente Teste",
            "anesthesiologistId": "test-anest-id-123",
            "labels": []
        }
        create_resp = requests.post(create_url, json=new_procedure_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Expected 201 Created, got {create_resp.status_code}"
        procedure = create_resp.json()
        procedure_id = procedure.get("id")
        assert procedure_id, "Procedure ID not returned on creation."

        # Upload an image for the procedure
        upload_url = f"{BASE_URL}/api/upload"
        # Simulate image bytes (PNG header with minimal content)
        image_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00"
        files = {
            "file": ("test_procedure_image.png", io.BytesIO(image_bytes), "image/png")
        }
        upload_resp = requests.post(upload_url, files=files, headers=headers, timeout=TIMEOUT)
        assert upload_resp.status_code == 200, f"Expected 200 OK on image upload, got {upload_resp.status_code}"
        upload_data = upload_resp.json()
        image_url = upload_data.get("url") or upload_data.get("fileUrl")
        assert image_url, "Image URL not returned after upload."

        # Associate uploaded image URL with the procedure
        update_url = f"{BASE_URL}/api/procedures/{procedure_id}"
        update_payload = {
            "images": [image_url]
        }
        update_resp = requests.put(update_url, json=update_payload, headers=headers, timeout=TIMEOUT)
        assert update_resp.status_code == 200, f"Expected 200 OK on procedure update, got {update_resp.status_code}"
        updated_procedure = update_resp.json()
        assert image_url in updated_procedure.get("images", []), "Uploaded image URL not associated with procedure."

        # Manually invoke OCR processing for the uploaded image (simulate)
        ocr_url = f"{BASE_URL}/api/ocr"
        ocr_payload = {"imageUrl": image_url}
        ocr_resp = requests.post(ocr_url, json=ocr_payload, headers=headers, timeout=TIMEOUT)
        assert ocr_resp.status_code == 200, f"Expected 200 OK from OCR endpoint, got {ocr_resp.status_code}"
        ocr_result = ocr_resp.json()
        extracted_text = ocr_result.get("text") or ocr_result.get("extractedText")
        assert extracted_text and len(extracted_text) > 0, "OCR did not extract any text."

        # Verify that OCR data can be reflected in procedure edits
        patch_data = {"labels": [extracted_text[:50]]}  # use first 50 chars as example label
        patch_resp = requests.patch(update_url, json=patch_data, headers=headers, timeout=TIMEOUT)
        assert patch_resp.status_code == 200, f"Expected 200 OK on procedure patch, got {patch_resp.status_code}"
        patched_procedure = patch_resp.json()
        assert extracted_text[:50] in patched_procedure.get("labels", []), "OCR extracted text not saved in procedure labels."

        # Retrieve procedure details (view) to validate
        get_resp = requests.get(update_url, headers=headers, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Expected 200 OK on procedure retrieval, got {get_resp.status_code}"
        procedure_data = get_resp.json()
        assert procedure_data.get("id") == procedure_id
        assert image_url in procedure_data.get("images", [])
        assert extracted_text[:50] in procedure_data.get("labels", [])

    finally:
        # Cleanup: delete created procedure if exists
        if procedure_id:
            del_url = f"{BASE_URL}/api/procedures/{procedure_id}"
            try:
                del_resp = requests.delete(del_url, headers=headers, timeout=TIMEOUT)
                assert del_resp.status_code in [200, 204], f"Failed to delete procedure, status {del_resp.status_code}"
            except Exception:
                pass

test_procedures_management_with_ocr_and_image_upload()
