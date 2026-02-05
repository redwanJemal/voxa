"""Symmetric encryption service using Fernet (derived from SECRET_KEY)."""

import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import settings

# Derive a valid 32-byte Fernet key from the app SECRET_KEY via SHA-256.
_raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
_fernet_key = base64.urlsafe_b64encode(_raw)
_fernet = Fernet(_fernet_key)


def encrypt(plaintext: str) -> str:
    """Encrypt a plaintext string → URL-safe base64 Fernet token."""
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a Fernet token back to the original plaintext."""
    return _fernet.decrypt(ciphertext.encode()).decode()
