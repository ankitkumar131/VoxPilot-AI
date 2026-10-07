# VoxPilot AI — AI call answering & telephone intelligence

Configure an AI agent with a script, connect your own LLM provider, and let VoxPilot AI
answer calls, ask questions, transcribe answers, record per-question audio, write structured
notes and produce summaries — for interviews, complaints, surveys, reception, leads and more.

## Monorepo

| Path | Stack |
|---|---|
| `backend/` | Node.js + Express + Socket.IO, MongoDB (optional) with built-in file store, local disk or S3-compatible recording storage |
| `frontend/` | Angular 18 (standalone, signals, SCSS) + Capacitor bridge |
| `native/android/` | Kotlin `VoxPilotTelephony` Capacitor plugin |
| `docs/` | `API.md`, `TELEPHONY.md` · `ARCHITECTURE.md` at root |

## Quickstart (no external services needed)

```bash
# 1. backend
cd backend && npm install
cp .env.example .env        # defaults work offline (file store + mock AI)
npm run seed                # demo user + agents + scripts (demo@voxpilot.ai / VoxPilot123!)
npm run dev                 # :4000

# 2. frontend (new terminal)
cd frontend && npm install
npm start                   # :4200, proxies /api + /socket.io → :4000
```

Open http://localhost:4200 → login → **New simulated call** → talk to the AI → open the call
for transcript, per-question recordings, notes and summary.

## Use your own LLM

Providers → Add provider → **OpenRouter** (`https://openrouter.ai/api/v1`) or **NVIDIA NIM**
(`https://integrate.api.nvidia.com/v1`) or any OpenAI-compatible endpoint (Ollama, vLLM, LM Studio…)
→ paste key (AES-256 encrypted, never shown again) → **Test connection** → Set default.
New vendors plug in as adapters in `backend/src/services/provider/` — no engine/UI changes.

## Production infrastructure

`backend/.env` ships with local defaults (`MONGODB_URI=mongodb://127.0.0.1:27017/voxpilot`, etc.).
If MongoDB isn't running, the app automatically uses its built-in file store instead —
no setup needed. Point `S3_ENDPOINT/…` at MinIO/R2/S3 only if you want recordings off-disk.
Recordings are owner-only (authenticated range streams).

## Telephony & Android

- Browser **simulated calls** work end-to-end today (mic, dictation, TTS, barge-in, takeover).
- PSTN/SIP production path is adapter-ready — see `docs/TELEPHONY.md`.
- Android APK: full step-by-step guide in **`docs/ANDROID.md`**
  (Android Studio setup → run on emulator/phone → build APK).
  The Kotlin module in `native/android/` adds device-level telephony (see its README).

## Cellular POC (SIM-call experiment)

`poc-cellular/` is a tiny native app that proves what stock Android allows on
physical-SIM calls (default dialer, auto-answer, RX capture, TX injection).
See its README for the exact test procedure before planning SIM-based features.

## Testing

```bash
cd backend && npm test        # engine validators + full MVP API flow (9 tests)
cd frontend && npx ng build   # production typecheck + bundle
```

## Security

JWT + refresh rotation, per-user data isolation, encrypted provider secrets, rate limiting,
helmet headers, audit logs, signed deduped webhooks. Never commit `.env` or keys.
