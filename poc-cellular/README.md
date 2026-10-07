# VoxPilot Cellular POC — can stock Android do AI-over-SIM calls?

A tiny **native-only** Android app (Kotlin, no Angular/backend) that experimentally answers:

1. **RX:** can an app hear the caller on a physical-SIM call?
2. **TX:** can an app play audio the caller hears on a physical-SIM call?

It also verifies the easy parts: default-dialer role, `InCallService` binding,
auto-answer, outbound `placeCall()`, and audio routing (speaker toggle).

> Be honest with the results: whatever your phone reports is the answer for
> your device. Expected on stock Android 9+: management ✓, RX ✗, TX ✗.

## You need

- Android Studio (from `docs/ANDROID.md`)
- Your **physical test phone with an active SIM** (NOT an emulator — this needs a real radio)
- A **second phone** (any phone) to call to/from

## Step 1 — Open in Android Studio

```powershell
git pull origin arena/07656dbe-voxpilot-ai
```

The POC intentionally ships **without** Gradle wrapper scripts (binary jar).
Copy them from the working Capacitor project:

```powershell
cd D:\...\VoxPilot-AI
Copy-Item frontend\android\gradlew poc-cellular\gradlew
Copy-Item frontend\android\gradlew.bat poc-cellular\gradlew.bat
Copy-Item -Recurse frontend\android\gradle poc-cellular\gradle_tmp
# merge: keep poc's wrapper properties, take the wrapper jar
Copy-Item poc-cellular\gradle_tmp\wrapper\gradle-wrapper.jar poc-cellular\gradle\wrapper\gradle-wrapper.jar
Remove-Item -Recurse poc-cellular\gradle_tmp
```

Then Android Studio → **Open** → `VoxPilot-AI\poc-cellular` → wait for Gradle sync
→ select your physical phone → ▶ **Run**.

## Step 2 — Prepare the phone

1. Open **VoxPilot POC** → tap **1. Set as default Phone app** → accept the system prompt.
   (Verify: Settings → Apps → Default apps → Phone app = *VoxPilot POC*.)
2. Tap **2. Grant permissions** → allow Phone, Microphone, Nearby/Notifications.
3. Status lines should read: dialer ✓, permissions ✓, SIM ✓ READY.

## Step 3 — Test A: INBOUND (second phone → your SIM)

1. In POC: enable **Auto-answer incoming calls**.
2. From the **second phone**, call your SIM number.
3. The POC call screen appears and answers. On the second phone, **keep talking**.
4. In POC call screen:
   - **RX:** tap **Start** → watch `rms`/`peak`/samples for 10 seconds.
     - Levels move with speech → RX WORKS (unexpected — note the source!).
     - Flat `0.000` while they talk → RX blocked. Tap **Src** + restart to try all 3 sources.
   - **TX:** tap **Tone A** → ask the person: *"do you hear a beep?"* → tap **Caller HEARD it** / **NOT heard**. Repeat with **Tone B**.
5. Hang up. Tap **Copy result report**.

## Step 4 — Test B: OUTBOUND (SIM → second phone)

1. In POC main screen enter the second phone's number → **3. Place test call**.
2. Answer on the second phone → POC call screen is up → repeat the RX + TX steps.
3. Hang up → **Copy result report**.

## Step 5 — IMPORTANT: switch your Phone app back

Settings → Apps → Default apps → **Phone app** → back to **Phone**.
(Otherwise all your calls keep opening the POC.)

## Step 6 — Report back

Paste into chat:

```
Device: <manufacturer + model>, Android <version>
Default dialer worked: yes/no
Auto-answer worked: yes/no
Outbound placeCall worked: yes/no
RX (VOICE_CALL): levels / flat zero / error?
RX (VOICE_COMMUNICATION): levels / flat zero / error?
RX (MIC): levels / flat zero / error?
TX Tone A heard by other person: yes/no
TX Tone B heard by other person: yes/no
+ the copied report
```

## Decision table

| Result | Meaning |
|---|---|
| RX levels + TX heard | Physical-SIM AI architecture is viable — build it |
| RX works, TX doesn't (or vice versa) | Half-duplex only — no AI conversation possible |
| Neither works | Stock Android blocks it — go cloud-number or Bluetooth-gateway |

## Troubleshooting

| Symptom | Fix |
|---|---|
| Gradle sync fails | Use Studio's bundled JDK 17 (`jbr-17`) in Settings → Build Tools → Gradle; wrapper must be Gradle 8.9+ |
| Role prompt never appears / denied | Settings → Apps → Default apps → Phone app → pick VoxPilot POC manually |
| `placeCall DENIED` | Grant CALL_PHONE (button 2) AND hold the default-dialer role |
| Call screen doesn't pop up | Pull down notifications → tap "POC call in progress"; grant Notifications permission |
| No calls reach `InCallService` at all | POC is not the default Phone app (see Step 2.1) |
| "Telecom binding: ✗ not bound", no `call added` in log, auto-answer never fires | Fresh-install binding quirk: Settings → Apps → Default apps → Phone app → switch to **Phone**, then back to **VoxPilot POC**; if still stuck, **reboot the phone**. OPPO/ColorOS: also enable Settings → Battery → VoxPilot POC → allow background activity + auto-launch |
