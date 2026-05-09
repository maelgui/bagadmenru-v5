#!/usr/bin/env python3
"""Generate VAPID keys for Web Push notifications.

Run this script once and add the generated keys to your environment variables:
- VAPID_PRIVATE_KEY
- VAPID_PUBLIC_KEY
"""

import base64

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    PublicFormat,
)

# Generate a new ECDSA key pair on the P-256 curve
private_key = ec.generate_private_key(ec.SECP256R1())

# Extract raw private key (32 bytes) in URL-safe base64
private_numbers = private_key.private_numbers()
private_key_bytes = private_numbers.private_value.to_bytes(32, byteorder="big")
private_key_b64 = base64.urlsafe_b64encode(private_key_bytes).rstrip(b"=").decode()

# Extract uncompressed public key (65 bytes) in URL-safe base64
public_key_bytes = private_key.public_key().public_bytes(
    Encoding.X962, PublicFormat.UncompressedPoint
)
public_key_b64 = base64.urlsafe_b64encode(public_key_bytes).rstrip(b"=").decode()

print("=" * 60)
print("VAPID Keys Generated Successfully!")
print("=" * 60)
print()
print("Add these to your .env file:")
print()
print(f"VAPID_PRIVATE_KEY={private_key_b64}")
print(f"VAPID_PUBLIC_KEY={public_key_b64}")
print()
print("=" * 60)
