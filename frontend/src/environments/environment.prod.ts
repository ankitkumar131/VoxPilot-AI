// Production / APK build: baked-in default server. On a phone this MUST be
// overridden in-app (Login → Server, or Settings → Server connection) with
// your PC's address, e.g. http://192.168.1.10:4000 (device) or
// http://10.0.2.2:4000 (Android emulator).
export const environment = {
  production: true,
  apiBaseUrl: '',
};
