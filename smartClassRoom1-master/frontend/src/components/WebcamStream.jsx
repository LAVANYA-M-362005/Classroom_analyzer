import React, { useRef, useEffect, useState } from 'react';
import { CameraOff } from 'lucide-react';

const WebcamStream = ({ wsRef, onFrame }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [camError, setCamError]   = useState(false);
  const [camReady, setCamReady]   = useState(false);

  useEffect(() => {
    let interval;
    let audioContext;
    let analyser;
    let micStream;
    let dataArray;

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setCamReady(true);
        }
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioContext = new AudioContext();
          micStream = audioContext.createMediaStreamSource(stream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          dataArray = new Uint8Array(analyser.frequencyBinCount);
          micStream.connect(analyser);
        }
      } catch (err) {
        console.error('Camera error:', err);
        setCamError(true);
      }
    };

    const getAudioLevel = () => {
      if (!analyser || !dataArray) return null;
      analyser.getByteFrequencyData(dataArray);
      const values = Array.from(dataArray);
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      return Math.round(average);
    };

    startWebcam();

    // Send frames every 1.2 s when WS is open
    interval = setInterval(() => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      const ws     = wsRef?.current;
      if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;
      if (video.videoWidth === 0) return;

      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const frame = canvas.toDataURL('image/jpeg', 0.8);
      const audioLevel = getAudioLevel();
      const payload = JSON.stringify({ frame, audio_level_db: audioLevel });
      ws.send(payload);
      onFrame?.(frame);
    }, 1200);

    return () => {
      clearInterval(interval);
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
      videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    };
  }, [wsRef]);  // eslint-disable-line

  if (camError) {
    return (
      <div className="video-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)', minHeight: 180 }}>
        <CameraOff size={40} />
        <span style={{ fontSize: '0.85rem' }}>Camera not accessible</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', maxWidth: 200 }}>
          Allow browser camera access and reload
        </span>
      </div>
    );
  }

  return (
    <div className="video-wrap">
      <video ref={videoRef} autoPlay playsInline muted style={{ opacity: camReady ? 1 : 0.3, transition: 'opacity 0.4s' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="video-overlay" />

      {/* LIVE badge */}
      <div className="video-badge">
        <div className="dot" />
        REC
      </div>
    </div>
  );
};

export default WebcamStream;
