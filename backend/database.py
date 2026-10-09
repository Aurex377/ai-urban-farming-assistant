"""
Database Connection Module
--------------------------
Handles the connection to your existing Supabase project.
Loads environment variables from backend/.env and initializes the Supabase client.

IMPORTANT:
- Connects to your EXISTING Supabase project.
- Does NOT create, drop, or alter database tables.
- Does NOT use MySQL, XAMPP, or SQLite.
"""

import os
import re
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import HTTPException, status

# Explicitly load .env from the backend directory regardless of current working directory
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)


def sanitize_supabase_url(url: str) -> str:
    """
    Ensures the URL is the API Project URL (https://<project-ref>.supabase.co).
    If a user pastes the Dashboard URL (https://supabase.com/dashboard/project/<ref>/...),
    this automatically converts it to the proper API URL.
    """
    url = url.strip()
    match = re.search(r"supabase\.com/dashboard/project/([a-zA-Z0-9]+)", url)
    if match:
        project_ref = match.group(1)
        return f"https://{project_ref}.supabase.co"
    return url


def get_supabase_client() -> Client:
    """
    Returns an active Supabase Client, or raises HTTPException 500 if unconfigured.
    """
    url = sanitize_supabase_url(os.getenv("SUPABASE_URL", ""))
    key = os.getenv("SUPABASE_KEY", "").strip()

    if not url or not key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase credentials are not configured. Please add SUPABASE_URL and SUPABASE_KEY to your .env file."
        )

    try:
        return create_client(url, key)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect to Supabase: {str(exc)}"
        )


# Global lazy client reference
_client_instance: Optional[Client] = None


def get_supabase() -> Client:
    """
    FastAPI dependency to retrieve the Supabase client.
    """
    global _client_instance
    if _client_instance is None:
        _client_instance = get_supabase_client()
    return _client_instance
