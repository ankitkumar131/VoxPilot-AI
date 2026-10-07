// Capacitor/native bridge. Web-first: every call degrades gracefully in the browser.
// Native Android module (Kotlin) implements 'VoxPilotTelephony' for device features.
export interface NativeCallState { active: boolean; number?: string; startedAt?: string }

export const NativeBridge = {
  isNative(): boolean {
    return !!(window as unknown as { Capacitor?: unknown }).Capacitor;
  },
  async getCallState(): Promise<NativeCallState> {
    try {
      const w = window as unknown as { Capacitor?: { Plugins: Record<string, Record<string, (o?: object) => Promise<unknown>>> } };
      const plugin = w.Capacitor?.Plugins?.['VoxPilotTelephony'];
      if (!plugin) return { active: false };
      return (await plugin['getCallState']()) as NativeCallState;
    } catch { return { active: false }; }
  },
  async setSpeakerphone(on: boolean): Promise<void> {
    try {
      const w = window as unknown as { Capacitor?: { Plugins: Record<string, Record<string, (o?: object) => Promise<unknown>>> } };
      await w.Capacitor?.Plugins?.['VoxPilotTelephony']?.['setSpeakerphone']?.({ on });
    } catch { /* web: no-op */ }
  },
  async notify(title: string, body: string): Promise<void> {
    try {
      const w = window as unknown as { Capacitor?: { Plugins: Record<string, Record<string, (o?: object) => Promise<unknown>>> } };
      const p = w.Capacitor?.Plugins?.['VoxPilotNotifications'];
      if (p) { await p['notify']?.({ title, body }); return; }
    } catch { /* fall through */ }
    try {
      if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body });
    } catch { /* noop */ }
  },
};
