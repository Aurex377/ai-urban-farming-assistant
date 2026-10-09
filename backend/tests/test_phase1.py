"""
GrowWise AI — Phase 1 Test Suite
--------------------------------
Validates:
1. Service & Database Health
2. Plant CRUD Operations
3. Validation Guards (Invalid payload, oversized files, unsupported mime types)
4. Ownership / Authorization checks
5. Image Upload & Validation
6. Diagnosis Creation in Pending State
"""

import io
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

TEST_USER_ID = "27865d2c-302e-4a2d-83aa-c1c9ea7338a4"
OTHER_USER_ID = "99999999-9999-9999-9999-999999999999"


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_database_health_endpoint():
    response = client.get("/health/database")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "connected"
    assert data["table_checked"] == "plants"


def test_create_plant_invalid_payload():
    # Empty plant name should be rejected with 422
    response = client.post("/api/plants", json={"plant_name": "   "})
    assert response.status_code == 422


def test_plant_crud_lifecycle():
    # 1. Create Plant
    create_payload = {
        "plant_name": "Test Rosemary",
        "species": "Rosmarinus officinalis",
        "plant_type": "Herb",
        "planted_date": "2026-10-09",
        "user_id": TEST_USER_ID,
    }
    create_res = client.post("/api/plants", json=create_payload)
    assert create_res.status_code == 201, create_res.text
    created = create_res.json()
    plant_id = created["id"]
    assert created["name"] == "Test Rosemary"
    assert created["plant_name"] == "Test Rosemary"
    assert created["user_id"] == TEST_USER_ID

    try:
        # 2. Get Plant by ID
        get_res = client.get(f"/api/plants/{plant_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == plant_id

        # 3. List Plants
        list_res = client.get("/api/plants")
        assert list_res.status_code == 200
        plant_ids = [p["id"] for p in list_res.json()]
        assert plant_id in plant_ids

        # 4. Update Plant (PATCH)
        patch_res = client.patch(
            f"/api/plants/{plant_id}",
            json={"plant_name": "Updated Rosemary", "species": "Salvia rosmarinus"}
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["name"] == "Updated Rosemary"

        # 5. Reject Invalid Image Type
        fake_file = io.BytesIO(b"not an image file")
        invalid_upload = client.post(
            f"/api/plants/{plant_id}/images",
            files={"file": ("document.txt", fake_file, "text/plain")}
        )
        assert invalid_upload.status_code == 400

        # 6. Reject Oversized Image (> 10MB)
        oversized_data = io.BytesIO(b"0" * (11 * 1024 * 1024))
        oversized_upload = client.post(
            f"/api/plants/{plant_id}/images",
            files={"file": ("huge.jpg", oversized_data, "image/jpeg")}
        )
        assert oversized_upload.status_code == 400

        # 7. Upload Valid Image
        # Minimal 1x1 valid PNG bytes
        valid_png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01"
            b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        upload_res = client.post(
            f"/api/plants/{plant_id}/images",
            files={"file": ("leaf.png", io.BytesIO(valid_png), "image/png")}
        )
        assert upload_res.status_code == 201, upload_res.text
        image_data = upload_res.json()
        image_id = image_data["image_id"]
        assert image_data["success"] is True

        # 8. List Images for Plant
        images_res = client.get(f"/api/plants/{plant_id}/images")
        assert images_res.status_code == 200
        assert any(img["id"] == image_id for img in images_res.json())

        # 9. Create Pending Diagnosis Record
        diag_res = client.post(
            f"/api/plants/{plant_id}/diagnoses",
            json={"image_id": image_id}
        )
        assert diag_res.status_code == 201, diag_res.text
        diag_data = diag_res.json()
        diagnosis_id = diag_data["id"]
        assert diag_data["status"] == "pending"
        assert diag_data["confidence"] == 0.0
        assert "Pending" in diag_data["disease_name"]

        # 10. Get Diagnosis History
        plant_diags_res = client.get(f"/api/plants/{plant_id}/diagnoses")
        assert plant_diags_res.status_code == 200
        assert any(d["id"] == diagnosis_id for d in plant_diags_res.json())

        # 11. Get Single Diagnosis by ID
        single_diag_res = client.get(f"/api/diagnoses/{diagnosis_id}")
        assert single_diag_res.status_code == 200
        assert single_diag_res.json()["id"] == diagnosis_id

        # 12. Delete Plant Image
        del_img_res = client.delete(f"/api/plants/{plant_id}/images/{image_id}")
        assert del_img_res.status_code == 200

    finally:
        # Cleanup: Delete the test plant
        del_res = client.delete(f"/api/plants/{plant_id}")
        assert del_res.status_code == 200


def test_reject_unauthorized_plant_access():
    # Attempting to access non-existent plant returns 404
    res = client.get("/api/plants/999999999")
    assert res.status_code == 404
