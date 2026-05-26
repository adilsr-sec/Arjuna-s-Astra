from pathlib import Path

import cv2
import numpy as np
import soundfile as sf


def main():
    samples = Path("samples")
    samples.mkdir(parents=True, exist_ok=True)

    sr = 16000
    t = np.linspace(0, 3, sr * 3, endpoint=False)
    signal = 0.35 * np.sin(2 * np.pi * 440 * t) + 0.2 * np.sin(2 * np.pi * 880 * t)
    sf.write(samples / "sample_audio.wav", signal, sr)

    canvas = np.zeros((768, 1024, 3), dtype=np.uint8)
    canvas[:] = (18, 28, 46)
    for i in range(0, 1024, 32):
        cv2.line(canvas, (i, 0), (i, 767), (40, 70, 95), 1)
    for j in range(0, 768, 32):
        cv2.line(canvas, (0, j), (1023, j), (40, 70, 95), 1)
    cv2.putText(canvas, "ARJUNA'S ARROW - SAMPLE COVER", (120, 380), cv2.FONT_HERSHEY_SIMPLEX, 1, (120, 220, 180), 2)
    cv2.imwrite(str(samples / "sample_cover.png"), canvas)

    print("Generated sample_audio.wav and sample_cover.png in backend/samples")


if __name__ == "__main__":
    main()
