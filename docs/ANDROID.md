# VoxPilot AI — Build the APK & run on Android Studio (full guide)

> Written for **Windows** (you can adapt paths for macOS/Linux).
> Time needed: ~45–60 min first time (mostly downloads), ~5 min afterwards.

## How it works

The Android app = your Angular web app bundled inside a native shell
([Capacitor](https://capacitorjs.com)). The APK talks to the VoxPilot backend
running on your PC over your local network — **no cloud needed**.

```
┌──────────────┐   Wi-Fi / USB   ┌──────────────┐   ┌─────────┐
│ Android app  │ ── http:// ───► │ backend :4000│──►│ MongoDB │
│ (APK)        │  <PC-IP>:4000   │ (your PC)    │   │ (local) │
└──────────────┘                 └──────────────┘   └─────────┘
```

---

## Part A — Install the tools (one time)

### A1. Install Android Studio
1. Download from https://developer.android.com/studio (Ladybug or newer).
2. Run the installer → **Standard** setup → Finish. It downloads the SDK automatically.
3. Open Android Studio once, let it finish downloading components.

### A2. Install SDK pieces
1. Android Studio → **Settings → Languages & Frameworks → Android SDK** (or
   **More Actions → SDK Manager** on the welcome screen).
2. **SDK Platforms** tab → check **Android 14 (API 34)** → Apply → OK.
3. **SDK Tools** tab → check:
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Android Emulator (for virtual device testing)
   → Apply → OK.

### A3. Set environment variables (Windows)
1. Find your SDK path in SDK Manager (usually
   `C:\Users\<you>\AppData\Local\Android\Sdk`).
2. Windows Search → "Environment Variables" → **Environment Variables…** →
   under **User variables** add:
   - `ANDROID_HOME` = `C:\Users\<you>\AppData\Local\Android\Sdk`
   - Edit `Path` → add `%ANDROID_HOME%\platform-tools`
3. Android Studio bundles its own JDK (no separate Java install needed).
   Capacitor/Gradle will use it automatically.
4. **Restart your terminal** (PowerShell/CMD), then verify:
   ```powershell
   adb --version
   java -version
   node --version   # need Node 18+
   ```

### A4. Accept SDK licenses
```powershell
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
```
(If `cmdline-tools` is missing: SDK Manager → SDK Tools → check
**Android SDK Command-line Tools** → Apply. Then re-run. Press `y` for all.)

---

## Part B — Prepare the backend (your PC = the server)

The phone/emulator needs to reach your backend over the network.

### B1. Find your PC's Wi-Fi IP
```powershell
ipconfig
```
Look under your Wi-Fi adapter → **IPv4 Address**, e.g. `192.168.1.10`.
Write it down — the app will use `http://192.168.1.10:4000`.

### B2. Allow port 4000 through Windows Firewall
Run **PowerShell as Administrator**:
```powershell
New-NetFirewallRule -DisplayName "VoxPilot backend" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

### B3. Start the backend (leave it running)
```powershell
cd D:\...\VoxPilot-AI\backend
npm install
npm run seed   # first time only (demo user + agents + scripts)
npm run dev    # listens on 0.0.0.0:4000 — reachable from your network
```
Check from your PC browser: http://localhost:4000/api/health → `{"ok":true,...}`.

> The backend already allows the Android app origin (`capacitor://localhost`,
> `http://localhost`) via CORS — no config change needed.

---

## Part C — Build the web app & add Android (first time)

```powershell
cd D:\...\VoxPilot-AI\frontend
npm install
npm run build:apk
```

What this does:
1. `ng build --configuration production` → output in `dist\frontend\browser`
2. `npx cap sync android` → copies it into the native project

> **First time only:** if `frontend\android` doesn't exist yet, run this
> **before** the command above:
> ```powershell
> npx cap add android
> ```
> Afterwards, every code change = `npm run build:apk` again (build + sync).

---

## Part D — Open in Android Studio & configure

### D1. Open the project
1. Android Studio → **Open** → select `VoxPilot-AI\frontend\android`
   (the `android` folder, not the repo root).
2. Wait for **Gradle sync** to finish (progress bar at bottom, 2–10 min first time).
   - If prompted about SDK location/JDK — accept defaults (bundled JDK 17).
   - If "Missing SDK" appears — click the install link it offers.

### D2. Allow cleartext HTTP (local dev only)
The app talks to `http://<PC-IP>:4000`, which Android blocks by default.

1. Open `app/src/main/AndroidManifest.xml`.
2. Add the mic permission (for voice answers) inside `<manifest>`, next to the
   existing `INTERNET` permission:
   ```xml
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
   ```
3. In the `<application ...>` tag, add:
   ```xml
   android:usesCleartextTraffic="true"
   ```
   Example:
   ```xml
   <application
       android:allowBackup="true"
       android:usesCleartextTraffic="true"
       ... >
   ```
4. Click **Sync Now** if prompted.

> Production note: for a Play Store release you would use an `https` backend
> with a `network_security_config.xml` instead of this flag.

---

## Part E — Run the app

### Option 1: Android Emulator (easiest, no phone needed)
1. Android Studio → **Device Manager** (phone icon, right toolbar) →
   **Create Device** → Pixel 7 → System image **API 34** (download if asked) → Finish.
2. Press ▶ **Run** (or `Shift+F10`). Pick your emulator. The app installs & opens.
3. In the app login screen → **⚙ Server settings** → enter:
   ```
   http://10.0.2.2:4000
   ```
   (`10.0.2.2` = your PC, as seen from the emulator. `localhost` will NOT work.)
4. Login: `demo@voxpilot.ai` / `VoxPilot123!` → start a simulated call. 🎉

### Option 2: Physical phone via USB
1. Phone → Settings → About → tap **Build number** 7× (enables Developer mode).
2. Developer options → enable **USB debugging**.
3. Connect phone via USB → allow the debugging prompt.
4. Connect phone to the **same Wi-Fi** as your PC.
5. Android Studio → select your phone in the device dropdown → ▶ Run.
6. In the app → **⚙ Server settings** → enter your PC's Wi-Fi IP:
   ```
   http://192.168.1.10:4000     ← use YOUR ipconfig address
   ```
7. Login with the demo account.

> You can change/test the server address anytime later in
> **Settings → Server connection** (includes a Test button).

---

## Part F — Build the APK file

### Debug APK (for testing/sharing)
- **In Android Studio:** menu **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
  Wait → click **locate** in the notification.
- **Or via terminal:**
  ```powershell
  cd frontend\android
  .\gradlew assembleDebug
  ```
- Output:
  ```
  frontend\android\app\build\outputs\apk\debug\app-debug.apk
  ```
- Install it: drag-drop the APK onto a running emulator, or copy to phone
  and tap it (allow "Install unknown apps"), or:
  ```powershell
  adb install -r app\build\outputs\apk\debug\app-debug.apk
  ```

### Release APK (later, for distribution)
1. **Build → Generate Signed App Bundle / APK…** → APK → Create new keystore
   (save `voxpilot.jks` + passwords somewhere safe — losing it = can't update the app).
2. Select `release` → Finish. Output in `...\outputs\apk\release\`.

---

## Part G — Daily workflow (after setup)

```powershell
# Terminal 1 — backend (always running while testing the app)
cd VoxPilot-AI\backend
npm run dev

# Terminal 2 — after every frontend code change:
cd VoxPilot-AI\frontend
npm run build:apk        # rebuild web app + sync into android/
```
Then just press ▶ Run again in Android Studio (or rebuild the APK).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `localhost` doesn't work in app | Correct — use `10.0.2.2` (emulator) or PC Wi-Fi IP (phone). `localhost` = the phone itself |
| Login fails / "check Server URL" | Backend not running? Wrong IP? PC + phone on different Wi-Fi? Firewall rule missing (Part B2)? Test in phone's Chrome: `http://<PC-IP>:4000/api/health` |
| `ERR_CLEARTEXT_NOT_PERMITTED` | `android:usesCleartextTraffic="true"` missing (Part D2) → rebuild |
| Gradle sync fails / JDK error | Use Android Studio's bundled JDK: Settings → Build Tools → Gradle → Gradle JDK = `jbr-17` |
| `SDK location not found` | Set `ANDROID_HOME` (Part A3) or create `frontend\android\local.properties`: `sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk` |
| `Could not read workspace metadata ... metadata.bin` (corrupted Gradle cache) | Close Android Studio → `cd frontend\android` → `.\gradlew --stop` → delete `C:\Users\<you>\.gradle\caches\<version>` (or the whole `caches` folder) + `frontend\android\.gradle` → reopen, **File → Invalidate Caches → Invalidate and Restart** → sync again |
| `adb unauthorized` | Re-plug USB, accept the on-phone prompt, retry |
| Mic doesn't record in app | Grant Microphone permission when asked; typing answers always works regardless |
| App shows old UI after changes | You forgot `npm run build:apk` (build + sync) before Run |
| Port 4000 already in use | Another backend running — kill it or change `PORT` in `backend\.env` |

## What's native vs web in this APK?

- **Web (Angular/Capacitor):** every screen — dashboard, agents, scripts, calls,
  transcripts, recordings, notes, settings, simulated calls.
- **Native bridge ready:** `native/android/VoxPilotTelephony` (Kotlin) exposes
  speakerphone/audio-routing + call-state presence to the web app via
  `src/app/core/native/bridge.ts`. Wire it as a Capacitor plugin when you need
  device-level VoIP features (see `native/android/README.md`).
