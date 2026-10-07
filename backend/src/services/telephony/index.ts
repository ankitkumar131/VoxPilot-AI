// Telephony abstraction. Mock provider drives simulated/browser calls.
// SIP/Twilio adapters implement the same interface for production PSTN.
// NOTE: A third-party Android app cannot tap both sides of a carrier call;
// production voice path is cloud telephony (SIP/PSTN provider) → media stream → VoxPilot.
import { ITelephonyProvider } from '../provider/types';
import { newId } from '../../utils/ids';
import { logger } from '../../utils/logger';

export const mockTelephony: ITelephonyProvider = {
  id: 'mock',
  async placeCall(to: string) {
    const externalId = newId('mockcall');
    logger.info('mock telephony placeCall', { to, externalId });
    return { externalId, from: 'VoxPilot', to };
  },
  async hangup(externalId: string) { logger.info('mock telephony hangup', { externalId }); },
  async sendAudio(externalId: string, audio: Buffer, mime: string) {
    logger.debug('mock telephony sendAudio', { externalId, bytes: audio.length, mime });
  },
};

// Production stub: wire to your SIP trunk (Asterisk/FreeSWITCH/Twilio Media Streams).
// Implement RTP/SRTP forwarding to the voice pipeline; keep signaling here only.
export const sipTelephony: ITelephonyProvider = {
  id: 'sip',
  async placeCall() { throw new Error('SIP provider not configured — set telephony settings and implement the SIP gateway (see docs/TELEPHONY.md)'); },
  async hangup() { throw new Error('SIP provider not configured'); },
  async sendAudio() { throw new Error('SIP provider not configured'); },
};

export function telephonyFor(provider: string): ITelephonyProvider {
  return provider === 'sip' ? sipTelephony : mockTelephony;
}
