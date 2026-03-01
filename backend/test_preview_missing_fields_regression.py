#!/usr/bin/env python3
import json
import os
import sys

import requests

BASE_URL = os.getenv("TEST_BASE_URL", "https://smart-form-filler-1.onrender.com")
TEMPLATE_URL = os.getenv(
    "TEST_TEMPLATE_URL",
    "https://uwajqrjmamoaccslzrzo.supabase.co/storage/v1/object/public/docx-files/templates/template_20260107_091842_a18da2cb.docx",
)
USERNAME = os.getenv("TEST_USERNAME", "admin")
PASSWORD = os.getenv("TEST_PASSWORD", "admin123")
USER_INFO_TEXT = os.getenv(
    "TEST_USER_INFO",
    "姓名：张三\n联系电话：13800000000\n毕业院校：测试大学",
)
TIMEOUT_SECONDS = int(os.getenv("TEST_TIMEOUT_SECONDS", "45"))


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def login() -> str:
    url = f"{BASE_URL}/api/login"
    response = requests.post(
        url,
        data={"username": USERNAME, "password": PASSWORD},
        timeout=TIMEOUT_SECONDS,
    )
    if response.status_code != 200:
        fail(f"login status={response.status_code}, body={response.text[:300]}")

    payload = response.json()
    token = payload.get("token")
    if not token:
        fail(f"login missing token, body={response.text[:300]}")
    return token


def download_template() -> bytes:
    response = requests.get(TEMPLATE_URL, timeout=TIMEOUT_SECONDS)
    if response.status_code != 200:
        fail(f"download template status={response.status_code}")
    if not response.content:
        fail("downloaded template is empty")
    return response.content


def run_analyze_missing(token: str, template_bytes: bytes) -> list[str]:
    url = f"{BASE_URL}/api/analyze-missing"
    headers = {"Authorization": f"Bearer {token}"}
    files = {
        "docx": (
            "template.docx",
            template_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
        "user_info_text": (None, USER_INFO_TEXT),
    }

    response = requests.post(url, headers=headers, files=files, timeout=TIMEOUT_SECONDS)
    if response.status_code != 200:
        fail(f"analyze-missing status={response.status_code}, body={response.text[:300]}")

    payload = response.json()
    if not payload.get("success"):
        fail(f"analyze-missing success=false, body={response.text[:500]}")

    missing_fields = payload.get("missing_fields")
    if not isinstance(missing_fields, list):
        fail("analyze-missing missing_fields is not a list")

    return missing_fields


def run_preview(token: str, template_bytes: bytes) -> dict:
    url = f"{BASE_URL}/api/process"
    headers = {"Authorization": f"Bearer {token}"}
    files = {
        "docx": (
            "template.docx",
            template_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
        "user_info_text": (None, USER_INFO_TEXT),
        "preview": (None, "true"),
    }

    response = requests.post(url, headers=headers, files=files, timeout=TIMEOUT_SECONDS)
    if response.status_code != 200:
        fail(f"preview status={response.status_code}, body={response.text[:300]}")

    try:
        payload = response.json()
    except json.JSONDecodeError as exc:
        fail(f"preview response is not json: {exc}")

    if not payload.get("success"):
        fail(f"preview success=false, body={response.text[:500]}")

    if not payload.get("data"):
        fail("preview missing data payload")

    missing_fields = payload.get("missing_fields")
    if not isinstance(missing_fields, list):
        fail("preview missing_fields is not a list")

    if len(missing_fields) == 0:
        fail("preview missing_fields should not be empty for regression scenario")

    low_confidence_fields = payload.get("low_confidence_fields")
    if not isinstance(low_confidence_fields, list):
        fail("preview low_confidence_fields is not a list")

    fill_data = payload.get("fill_data")
    if not isinstance(fill_data, str) or not fill_data.strip():
        fail("preview fill_data is empty")

    try:
        parsed_fill_data = json.loads(fill_data)
    except json.JSONDecodeError as exc:
        fail(f"preview fill_data is not valid json: {exc}")

    if not isinstance(parsed_fill_data, dict):
        fail("preview fill_data json is not an object")

    return payload


def run_download_with_fill_data(token: str, template_bytes: bytes, fill_data: str) -> None:
    url = f"{BASE_URL}/api/process"
    headers = {"Authorization": f"Bearer {token}"}
    files = {
        "docx": (
            "template.docx",
            template_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
        "user_info_text": (None, USER_INFO_TEXT),
        "preview": (None, "false"),
        "fill_data": (None, fill_data),
    }

    response = requests.post(url, headers=headers, files=files, timeout=TIMEOUT_SECONDS)
    if response.status_code != 200:
        fail(f"download status={response.status_code}, body={response.text[:300]}")

    content_type = response.headers.get("content-type", "")
    if "application/vnd.openxmlformats-officedocument.wordprocessingml.document" not in content_type:
        fail(f"download content-type unexpected: {content_type}")

    if not response.content.startswith(b"PK"):
        fail("downloaded docx does not look like a zip/docx file")


def main() -> None:
    print(f"BASE_URL={BASE_URL}")
    token = login()
    template = download_template()
    analyzed_missing_fields = run_analyze_missing(token, template)
    preview_payload = run_preview(token, template)
    run_download_with_fill_data(token, template, preview_payload.get("fill_data", ""))
    print(
        "OK: "
        f"analyze_missing={len(analyzed_missing_fields)}, "
        f"preview_missing={len(preview_payload.get('missing_fields', []))}, "
        f"preview_low_confidence={len(preview_payload.get('low_confidence_fields', []))}, "
        "download=pass"
    )


if __name__ == "__main__":
    main()
