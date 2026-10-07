# VoxPilot Android native module (Kotlin)

The Angular UI runs inside Capacitor. Device/phone capabilities live in the
`VoxPilotTelephony` Capacitor plugin (Kotlin), bridged via `src/app/core/native/bridge.ts`.

## What native code is for

- ConnectionService / Telecom integration for managed VoIP calls
- Call-state observation, speakerphone/audio routing
- Push notifications for call events
- Background audio + microphone policy handling

## What native code is NOT for

A third-party Android app **cannot** silently tap both sides of an ordinary
cellular carrier call. VoxPilot does not attempt this. Production PSTN voice
flows through a cloud telephony/SIP gateway (see `docs/TELEPHONY.md`); the
Android app is the control + review surface and the VoIP endpoint.

## Build

```bash
cd frontend
npx cap add android        # once (needs Android SDK)
npx cap sync android
```

Then open `frontend/android` in Android Studio. Copy
`VoxPilotTelephony/` into your Capacitor plugin source set, or publish it as
an AAR and add the dependency in `app/build.gradle`.
