// STT layer. MockStt passes through client-provided text (simulated calls) and
// reports audio presence; production adapters (Whisper/Deepgram) implement ISTTProvider.
import { ISTTProvider } from '../provider/types';
import { logger } from '../../utils/logger';

export const mockStt: ISTTProvider = {
  id: 'mock-stt',
  async transcribe(audio: Buffer, mime: string) {
    logger.debug('mock STT transcribe', { bytes: audio.length, mime });
    return { text: '', confidence: 0 };
  },
};

// OpenAI Whisper-compatible transcription (works with OpenAI or any Whisper endpoint).
export function makeWhisperStt(baseUrl: string, apiKey: string, model = 'whisper-1'): ISTTProvider {
  return {
    id: 'whisper',
    async transcribe(audio: Buffer, mime: string, language?: string) {
      const ext = mime.includes('mp3') ? 'audio.mp3' : mime.includes('wav') ? 'audio.wav' : 'audio.webm';
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(audio)], { type: mime }), ext);
      form.append('model', model);
      if (language) form.append('language', language.slice(0, 2));
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/audio/transcriptions`, {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form as any,
      });
      if (!res.ok) throw new Error(`STT HTTP ${res.status}`);
      const data: any = await res.json();
      return { text: data.text || '' };
    },
  };
}
