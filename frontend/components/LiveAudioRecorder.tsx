"use client";

import { useState, useRef, useEffect } from "react";

// Helper to write WAV file format
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);

  const channels = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit
  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  return new Blob([bufferArray], { type: "audio/wav" });
}

export default function LiveAudioRecorder({ onRecordingComplete }: { onRecordingComplete: (file: File | null) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedTime, setRecordedTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const webmBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        
        try {
          // Convert to standard WAV using AudioContext
          const arrayBuffer = await webmBlob.arrayBuffer();
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const wavBlob = audioBufferToWavBlob(audioBuffer);
          
          const file = new File([wavBlob], `live_record_${Date.now()}.wav`, { type: "audio/wav" });
          const url = URL.createObjectURL(file);
          setAudioUrl(url);
          onRecordingComplete(file);
        } catch (err) {
          console.error("Failed to process audio:", err);
          alert("Failed to process recorded audio. Your browser may not support Web Audio API decoding.");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordedTime(0);
      setAudioUrl(null);
      onRecordingComplete(null);

      timerRef.current = setInterval(() => {
        setRecordedTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const clearRecording = () => {
    setAudioUrl(null);
    setRecordedTime(0);
    onRecordingComplete(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="w-full bg-command p-3 rounded border border-neon/30 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-neon text-sm font-semibold flex items-center gap-2">
          {isRecording && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
          Live Audio Recording {isRecording || audioUrl ? `(${formatTime(recordedTime)})` : ""}
        </span>
        
        {audioUrl && !isRecording && (
          <span className="text-xs text-green-400 font-semibold">✓ Captured</span>
        )}
      </div>

      {!isRecording && !audioUrl && (
        <button 
          onClick={startRecording}
          className="w-full bg-accent/20 hover:bg-accent/40 text-accent rounded py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          ● Start Recording
        </button>
      )}

      {isRecording && (
        <button 
          onClick={stopRecording}
          className="w-full bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          ■ Stop Recording
        </button>
      )}

      {audioUrl && !isRecording && (
        <div className="flex flex-col gap-2">
          <audio src={audioUrl} controls className="w-full h-8" />
          <div className="flex gap-2">
            <button 
              onClick={startRecording}
              className="flex-1 bg-command border border-neon/30 hover:bg-command/80 rounded py-1.5 text-xs text-neon transition-colors"
            >
              Re-Record
            </button>
            <button 
              onClick={clearRecording}
              className="flex-1 bg-command border border-red-500/30 hover:bg-red-500/10 rounded py-1.5 text-xs text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
