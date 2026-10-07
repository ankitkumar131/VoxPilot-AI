// TTS layer. MockTts synthesizes a deterministic placeholder WAV (clearly labeled)
// so recording/playback works offline. Production: OpenAI/ElevenLabs/Coqui adapters.
import { ITTSProvider } from '../provider/types';

function encodeWav(samples: Float32Array, sampleRate = 16000): Buffer {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

// Speech-like cadence: syllable-ish amplitude modulation of a soft two-tone signal.
export function synthesizePlaceholderWav(text: string): Buffer {
  const words = Math.max(3, text.split(/\s+/).length);
  const seconds = Math.min(20, 0.6 + words * 0.28);
  const sr = 16000, n = Math.floor(seconds * sr);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const syll = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.2 * t);
    const tone = Math.sin(2 * Math.PI * (165 + 25 * Math.sin(2 * Math.PI * 0.7 * t)) * t)
      + 0.4 * Math.sin(2 * Math.PI * 330 * t);
    const env = Math.min(1, t * 8) * Math.min(1, (seconds - t) * 4);
    samples[i] = tone * 0.18 * syll * env;
  }
  return encodeWav(samples, sr);
}

export const mockTts: ITTSProvider = {
  id: 'mock-tts',
  async synthesize(text: string) {
    return { audio: synthesizePlaceholderWav(text), mime: 'audio/wav' };
  },
};

export function makeOpenAiTts(baseUrl: string, apiKey: string, model = 'tts-1', voice = 'alloy'): ITTSProvider {
  return {
    id: 'openai-tts',
    async synthesize(text: string) {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, voice, input: text.slice(0, 4000), response_format: 'mp3' }),
      });
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
      return { audio: Buffer.from(await res.arrayBuffer()), mime: 'audio/mpeg' };
    },
  };
}
