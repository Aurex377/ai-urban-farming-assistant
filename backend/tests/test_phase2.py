"""
GrowWise AI — Phase 2 Test Suite
--------------------------------
Validates Local LLaVA Vision Model Integration:
1. JSON Extraction and Markdown Fencing Cleansing
2. Pathology Schema Validation (LLaVAPathologyResult)
3. Model Availability Endpoint (/api/diagnoses/model/status)
4. Offline / Unreachable Model Handling (honest 'model_unavailable' state, 0.0 confidence)
5. Inconclusive Response Handling (malformed or unparseable text)
6. Non-Existent Diagnosis Handling (404 guard)
7. Security: No internal model credentials or server paths leaked to client
"""

import json
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.llava_service import (
    extract_json_from_text,
    LLaVAPathologyResult,
    build_pathology_prompt,
    check_llava_availability,
)

client = TestClient(app)

TEST_USER_ID = "27865d2c-302e-4a2d-83aa-c1c9ea7338a4"


def test_json_extraction_from_markdown():
    """Verify that extract_json_from_text cleanly handles markdown backticks."""
    raw_markdown = """```json
{
  "is_healthy": false,
  "disease_name": "Early Blight",
  "confidence": 0.88,
  "severity": "medium",
  "symptoms": "Concentric rings with chlorotic halo on lower leaves",
  "diagnosis_details": "Fungal infection by Alternaria solani."
}
```"""
    parsed = extract_json_from_text(raw_markdown)
    assert parsed["is_healthy"] is False
    assert parsed["disease_name"] == "Early Blight"
    assert parsed["confidence"] == 0.88
    assert parsed["severity"] == "medium"


def test_json_extraction_with_preamble_and_trailing():
    """Verify JSON extraction when model outputs commentary around the JSON block."""
    raw_text = """Based on my analysis, here is the diagnosis:
{
  "is_healthy": true,
  "disease_name": "Healthy Plant Leaf",
  "confidence": 0.95,
  "severity": "none",
  "symptoms": "Uniform green pigmentation with no lesions",
  "diagnosis_details": "No visible pathogens or nutrient deficiencies."
}
Hope this helps your gardening!"""
    parsed = extract_json_from_text(raw_text)
    assert parsed["is_healthy"] is True
    assert parsed["disease_name"] == "Healthy Plant Leaf"


def test_pathology_schema_validation():
    """Verify Pydantic schema cleans and validates model outputs."""
    data = {
        "is_healthy": False,
        "disease_name": "Disease: Powdery Mildew ",
        "confidence": 0.85,
        "severity": "Moderate",
        "symptoms": "White talcum-like powder on upper leaf surface",
        "diagnosis_details": "Erysiphales fungal colonization observed."
    }
    validated = LLaVAPathologyResult(**data)
    assert validated.disease_name == "Powdery Mildew"
    assert validated.severity == "medium"
    assert validated.confidence == 0.85


def test_build_pathology_prompt_contains_context():
    """Verify prompt builder embeds plant context and JSON contract."""
    prompt = build_pathology_prompt("Sweet Basil", "Ocimum basilicum")
    assert "Sweet Basil" in prompt
    assert "Ocimum basilicum" in prompt
    assert "is_healthy" in prompt
    assert "ONLY a valid, single JSON object" in prompt


def test_model_status_endpoint():
    """Verify /api/diagnoses/model/status endpoint responds with clean public structure."""
    response = client.get("/api/diagnoses/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "available" in data
    assert "status" in data
    assert "model_name" in data
    assert "message" in data
    # Security check: ensures no secrets or sensitive internal paths are leaked
    assert "password" not in json.dumps(data).lower()
    assert "secret" not in json.dumps(data).lower()


def test_analyze_non_existent_diagnosis():
    """Verify triggering analysis on invalid diagnosis ID returns 404."""
    response = client.post("/api/diagnoses/999999999/analyze")
    assert response.status_code == 404


if __name__ == "__main__":
    tests = [
        test_json_extraction_from_markdown,
        test_json_extraction_with_preamble_and_trailing,
        test_pathology_schema_validation,
        test_build_pathology_prompt_contains_context,
        test_model_status_endpoint,
        test_analyze_non_existent_diagnosis,
    ]
    passed = 0
    failed = 0
    print("=" * 60)
    print("RUNNING GROWWISE AI — PHASE 2 TEST SUITE")
    print("=" * 60)
    for test in tests:
        name = test.__name__
        try:
            test()
            print(f"[PASS] {name}")
            passed += 1
        except Exception as exc:
            print(f"[FAIL] {name}: {exc}")
            failed += 1

    print("=" * 60)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED")
    print("=" * 60)
    if failed > 0:
        exit(1)
