// Browser audio: TTS playback (SpeechSynthesis), mic capture (MediaRecorder),
// speech recognition (Web Speech API when available), clip playback queue.
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  speaking = signal(false);
  recording = signal(false);
  recognizing = signal(false);
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private recognition: unknown = null;

  speak(text: string, voice?: string, lang = 'en-US'): void {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text.slice(0, 600));
      u.lang = lang;
      const vs = synth.getVoices();
      const pick = vs.find(v => v.name.toLowerCase().includes((voice || '').toLowerCase())) || vs.find(v => v.lang.startsWith(lang.slice(0, 2)));
      if (pick) u.voice = pick;
      u.onstart = () => this.speaking.set(true);
      u.onend = () => this.speaking.set(false);
      u.onerror = () => this.speaking.set(false);
      this.speaking.set(true);
      synth.speak(u);
    } catch { this.speaking.set(false); }
  }
  stopSpeaking(): void {
    try { window.speechSynthesis?.cancel(); } catch {}
    this.speaking.set(false);
  }

  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); };
    this.mediaRecorder.start();
    this.recording.set(true);
  }
  stopRecording(): Promise<{ blob: Blob; base64: string; mime: string }> {
    return new Promise((resolve, reject) => {
      const rec = this.mediaRecorder;
      if (!rec) { reject(new Error('not recording')); return; }
      rec.onstop = async () => {
        this.recording.set(false);
        rec.stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' });
        const buf = await blob.arrayBuffer();
        let bin = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        resolve({ blob, base64: btoa(bin), mime: blob.type || 'audio/webm' });
      };
      rec.stop();
    });
  }

  /** Continuous dictation into a callback (Chrome/Edge). Returns false if unsupported. */
  startDictation(onText: (text: string, final: boolean) => void): boolean {
    const SR = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) return false;
    const rec = new (SR as new () => {
      lang: string; interimResults: boolean; continuous: boolean;
      onresult: ((e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
      onend: (() => void) | null; start(): void; stop(): void;
    })();
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true;
    rec.onresult = e => {
      const last = e.results[e.results.length - 1];
      onText(last[0].transcript, last.isFinal);
    };
    rec.onend = () => { if (this.recognizing()) { try { rec.start(); } catch {} } };
    this.recognition = rec;
    rec.start();
    this.recognizing.set(true);
    return true;
  }
  stopDictation(): void {
    this.recognizing.set(false);
    try { (this.recognition as { stop(): void } | null)?.stop(); } catch {}
    this.recognition = null;
  }
}
