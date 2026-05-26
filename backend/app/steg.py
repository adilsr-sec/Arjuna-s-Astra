import random

import cv2
import numpy as np


def _bytes_to_bits(data: bytes) -> list[int]:
    bits = []
    for byte in data:
        for i in range(7, -1, -1):
            bits.append((byte >> i) & 1)
    return bits


def _bits_to_bytes(bits: list[int]) -> bytes:
    out = bytearray()
    for i in range(0, len(bits), 8):
        b = 0
        chunk = bits[i : i + 8]
        if len(chunk) < 8:
            break
        for bit in chunk:
            b = (b << 1) | bit
        out.append(b)
    return bytes(out)


def embed_payload(cover_img_path: str, payload: bytes, seed: int) -> np.ndarray:
    image = cv2.imread(cover_img_path, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid cover image")
    h, w, c = image.shape
    total_channels = h * w * c

    header = len(payload).to_bytes(4, "big")
    stream = header + payload
    bits = _bytes_to_bits(stream)
    if len(bits) > total_channels:
        raise ValueError("Payload too large for selected image")

    flat = image.reshape(-1)
    positions = list(range(total_channels))
    rng = random.Random(seed)
    rng.shuffle(positions)
    for idx, bit in enumerate(bits):
        pos = positions[idx]
        flat[pos] = (flat[pos] & 0xFE) | bit
    return flat.reshape(image.shape)


def extract_payload(stego_img_path: str, seed: int) -> bytes:
    image = cv2.imread(stego_img_path, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid stego image")
    h, w, c = image.shape
    total_channels = h * w * c
    flat = image.reshape(-1)
    positions = list(range(total_channels))
    rng = random.Random(seed)
    rng.shuffle(positions)

    head_bits = []
    for i in range(32):
        head_bits.append(int(flat[positions[i]] & 1))
    payload_size = int.from_bytes(_bits_to_bytes(head_bits), "big")
    if payload_size <= 0:
        raise ValueError("No payload detected")

    body_bits = []
    total_bits = payload_size * 8
    for i in range(32, 32 + total_bits):
        body_bits.append(int(flat[positions[i]] & 1))
    return _bits_to_bytes(body_bits)


def psnr(original_path: str, stego_arr: np.ndarray) -> float:
    original = cv2.imread(original_path, cv2.IMREAD_COLOR)
    mse = np.mean((original.astype(np.float32) - stego_arr.astype(np.float32)) ** 2)
    if mse == 0:
        return 100.0
    return float(20 * np.log10(255.0 / np.sqrt(mse)))
