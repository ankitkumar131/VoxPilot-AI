import { HttpErrorResponse } from '@angular/common/http';

// Translates raw HTTP failures into actionable messages (mobile users often
// fight wrong server URLs / dead tunnels, so "SyntaxError ... not valid JSON"
// is never shown directly).
export function friendlyHttpError(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) {
      return 'Cannot reach the server — check the Server URL, your connection, and that the backend (and ngrok tunnel) is running.';
    }
    // Angular wraps JSON parse failures as status-200 with error.error = SyntaxError.
    const inner = (e.error as { error?: unknown } | null)?.error;
    if (e.status === 200 && inner instanceof Error) {
      return 'The server returned a web page instead of data — the tunnel URL may be wrong or expired, or this app build is outdated (pull latest code and rebuild).';
    }
    if (typeof (e.error as { error?: unknown } | null)?.error === 'string') {
      return (e.error as { error: string }).error;
    }
    if (e.status === 401) return 'Invalid email or password.';
    if (e.status) return `Request failed (HTTP ${e.status}). Check the Server URL and try again.`;
  }
  if (typeof (e as { message?: unknown })?.message === 'string' && (e as { message: string }).message) {
    return (e as { message: string }).message;
  }
  return 'Something went wrong — please try again.';
}
