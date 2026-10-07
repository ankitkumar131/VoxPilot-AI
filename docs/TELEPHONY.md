# VoxPilot AI — Telephony architecture

## Principle
All PSTN/SIP specifics live behind `ITelephonyProvider` (`backend/src/services/telephony/`).
The conversation engine, LLM, STT/TTS, recording and UI never import telephony SDKs.

## Production voice path (to build in P4)

```
Caller ──PSTN──► Twilio/SIP trunk ──media stream (WS/RTP)──► VoxPilot voice gateway
   ▲                                                                      │
   └─────────────── TTS audio ◄── orchestrator ◄── STT ◄───── VAD/barge-in ┘
```

1. **Signaling:** `POST /api/webhooks/telephony/:provider` receives ring/answer/hangup (signature-verified, deduped).
2. **Media:** a small gateway service (Node `drachtio`/Twilio Media Streams) forwards 8kHz μ-law/L16 frames to the STT adapter and plays back TTS chunks; emits `barge-in` on VAD speech-start while AI audio is playing.
3. **Orchestration:** identical `calls.service` path as simulated calls — only the audio transport differs.

## Android
The Android app is a **control + review + VoIP endpoint** surface (Capacitor + `VoxPilotTelephony`
ConnectionService). It does not — and cannot — tap carrier calls. Inbound PSTN is answered by the
cloud gateway; the user monitors/takes over from the app.

## SIP trunk checklist
- [ ] SIP account + DID numbers, SRTP/TLS
- [ ] Media-stream WebSocket endpoint + auth
- [ ] VAD tuning (barge-in sensitivity, hangover)
- [ ] DTMF + voicemail fallback
- [ ] Recording consent prompt per jurisdiction
- [ ] E911 / emergency-call disclaimers
