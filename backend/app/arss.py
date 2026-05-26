from io import BytesIO

import cv2
import librosa
import numpy as np
import soundfile as sf


def audio_to_arss(audio_path: str) -> tuple[bytes, dict, np.ndarray]:
    y, sr = librosa.load(audio_path, sr=16000, mono=True)
    # ARSS-inspired: mel filter bank + envelope for compact representation
    mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=96, n_fft=1024, hop_length=256, power=2.0)
    log_mel = librosa.power_to_db(mel + 1e-9)
    env = librosa.onset.onset_strength(y=y, sr=sr)
    arss = {"log_mel": log_mel.astype(np.float32), "envelope": env.astype(np.float32)}

    buffer = BytesIO()
    np.savez_compressed(buffer, **arss)
    meta = {"sr": sr, "shape": list(log_mel.shape), "hop_length": 256, "n_fft": 1024, "n_mels": 96}

    # Create a visual spectrogram preview for UI dialog.
    spec_norm = cv2.normalize(log_mel, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    spec_img = cv2.applyColorMap(spec_norm, cv2.COLORMAP_TURBO)
    spec_img = cv2.flip(spec_img, 0)
    return buffer.getvalue(), meta, spec_img


def arss_to_audio(arss_bytes: bytes, sr: int = 16000) -> tuple[bytes, np.ndarray]:
    data = np.load(BytesIO(arss_bytes))
    log_mel = data["log_mel"]
    
    spec_norm = cv2.normalize(log_mel, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    spec_img = cv2.applyColorMap(spec_norm, cv2.COLORMAP_TURBO)
    spec_img = cv2.flip(spec_img, 0)
    
    mel_power = librosa.db_to_power(log_mel)
    y = librosa.feature.inverse.mel_to_audio(
        mel_power,
        sr=sr,
        n_fft=1024,
        hop_length=256,
        n_iter=64,
    )

    out_buffer = BytesIO()
    sf.write(out_buffer, y, sr, format="WAV")
    return out_buffer.getvalue(), spec_img
