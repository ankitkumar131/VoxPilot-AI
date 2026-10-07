# VoxPilot AI — Architecture

> Answers instruction §35 (analyze → propose → limitations → models → APIs → structure → phases) and §31 (provider independence).

## 1. Requirements analysis

VoxPilot AI is an AI call-answering platform: users configure **agents** + **scripts** (question workflows),
connect their own **LLM provider**, and the system conducts phone conversations — asking, listening,
transcribing, recording per-question audio, writing structured notes, and producing summaries/evaluations.

Key product constraints:
- The **LLM must not own workflow control** — a deterministic engine owns state, retries, transitions, termination.
- **Providers must be swappable** (OpenRouter ↔ NVIDIA NIM ↔ self-hosted) without touching UI/engine/storage.
- **Local-first**: single instance, no Redis/cache server, no cloud required; MongoDB and S3 are optional upgrades.
- **API keys never reach the frontend** after storage; encrypted at rest; never logged.
- Telephony, STT, TTS, LLM, storage are **independent adapters** behind interfaces.
- MVP must work end-to-end with **zero external credentials** (mock/offline path), then light up with real keys.

## 2. System architecture

```
┌─────────────┐   HTTPS/WSS   ┌──────────────────────┐
│ Angular PWA │◄─────────────►│  Express + Socket.IO │──► MongoDB (or built-in file store)
│ + Capacitor │               │  backend             │──► Local disk (or S3-compatible)
└─────────────┘               └──────┬───────┬───────┘──► In-process cache (TTL)
                                     │       │
                    ┌────────────────┘       └────────────────┐
                    │ Conversation Engine (deterministic)      │ Realtime events
                    │  current Q / retries / branches / end    │ (transcript, status)
                    └────┬──────────┬──────────┬──────────────┘
                    ┌────▼───┐  ┌───▼────┐  ┌──▼──────┐  ┌────────────┐
                    │  LLM   │  │  STT   │  │   TTS   │  │ Telephony  │
                    │adapters│  │adapters│  │ adapters│  │ adapters   │
                    └────────┘  └────────┘  └─────────┘  └────────────┘
  OpenRouter │ NVIDIA NIM │ OpenAI-compat │ Mock      Twilio/SIP │ Mock(simulated)
```

**Request flow (simulated call):** browser → `POST /api/calls/simulate` → orchestrator creates
session, TTS greeting → caller answers (text/audio) → STT → deterministic engine + LLM interpretation →
next question/follow-up/retry/complete → notes → summary → Socket.IO pushes every event live.

**Production voice flow:** PSTN/SIP provider → media stream (RTP/WebSocket) → STT stream → same
orchestrator → TTS stream → provider → caller. Only the telephony adapter changes.

## 3. Technical limitations (honest accounting)

| Feature | Status | Notes |
|---|---|---|
| Browser simulated calls | ✅ Works | Mic + dictation + TTS via Web APIs |
| PSTN inbound/outbound | 🔌 Adapter-ready | Needs SIP trunk / Twilio Elastic SIP + media-stream gateway (see `docs/TELEPHONY.md`) |
| Android carrier-call tap | ❌ Not possible | Third-party apps cannot capture both sides of carrier calls on modern Android; by design we use Telecom VoIP + cloud telephony instead |
| Real STT/TTS | 🔌 Adapter-ready | Whisper/OpenAI adapters included; offline mock synthesizes placeholder WAVs so recording UX works without keys |
| Barge-in on PSTN | 🔌 Partial | Simulated path fully supports it (client signal + server event); PSTN needs VAD on the media stream (gateway TODO) |

Nothing is faked: mock paths are labeled "Mock (offline)" in the UI and logs.

## 4. Native vs web responsibility

- **Angular/Capacitor (shared):** dashboard, agents, scripts, calls, transcripts, recordings, notes, settings, provider config, simulated calls, notifications UI, human takeover controls.
- **Native Android (Kotlin `VoxPilotTelephony`):** Telecom/ConnectionService VoIP endpoint, audio routing, call-state presence, background audio policy, push. See `native/android/`.
- **Cloud/SIP gateway (required for PSTN):** SIP signaling, RTP bridging, VAD/barge-in detection, media fan-out to STT/TTS. See `docs/TELEPHONY.md`.

## 5. Database models (MongoDB; memory store mirrors these)

`users, agents, scripts(+questions), providers, calls(call_sessions), call_turns, transcripts(embedded in turns), recordings, recording_clips, notes, evaluations(in summaries), webhooks, audit_logs, settings`
Schemas: `backend/src/db/schemas.ts`, types: `backend/src/db/types.ts`. Audio bytes live on local disk (or S3-compatible storage when configured); the DB holds metadata + keys only.

## 6. API surface

REST (`/api`): `auth/*, agents, scripts, providers(+/:id/test), calls(/simulate, /:id/answer, /pause, /resume, /takeover, /hangup), dashboard/stats, settings, recordings/:id/stream (range, owner-only), webhooks/telephony/:provider (signed, deduped)`.
Realtime (`/socket.io`): `call-status, transcript-turn, current-question, notes-updated, summary-ready, call-started/ended, barge-in`. Full reference: `docs/API.md`.

## 7. Folder structure

```
backend/src/{index.ts, config.ts, db/{types,schemas,repository,memory,cache}, middleware/,
  routes/, services/{provider/{types,registry,openaiCompatible,mockLlm}, conversation/{engine,
  interpreter,validators,prompts,summary}, voice/{stt,tts}, telephony, storage}, realtime/socket.ts,
  utils/{crypto,logger,ids}, templates.ts, seed.ts, __tests__/}
frontend/src/app/{core/{api,auth*,socket,audio,toast,native/bridge}, shared/components/{layout,
  status-badge,audio-player}, features/{auth,dashboard,agents,scripts,calls,providers,settings}}
native/android/VoxPilotTelephony  — Kotlin Capacitor plugin
docs/{API.md, TELEPHONY.md}  docker-compose.yml  deploy/nginx.conf
```

## 8. Development phases (per instruction §29)

- [x] P0 project structure, backend, auth, agents, scripts, provider abstraction, OpenRouter/NVIDIA adapters
- [x] P1 deterministic conversation engine, mock voice loop, WebSocket realtime, recording, transcription, notes, summary/eval
- [x] P2 Angular SaaS UI (all screens), Capacitor config + Kotlin bridge stub
- [x] P3 security hardening (JWT+refresh, encrypted secrets, rate limits, audit, signed webhooks), tests, docker-compose
- [ ] P4 telephony gateway (SIP/Twilio media streams), streaming STT/TTS cutover, Android Studio build + FCM
- [ ] P5 eval harness, retention janitor, multi-user roles/billing, load tests
