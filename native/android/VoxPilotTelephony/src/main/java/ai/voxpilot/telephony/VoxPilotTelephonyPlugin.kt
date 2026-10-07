package ai.voxpilot.telephony

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioManager
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission

/**
 * VoxPilot native bridge.
 *
 * Exposes only platform-supported capabilities:
 * - audio routing (speakerphone)
 * - coarse call-state observation (for UI presence, NOT call audio capture)
 * - local notifications hook (delivered via Capacitor LocalNotifications or FCM)
 *
 * Deliberately absent: carrier call audio tapping — not available to
 * third-party apps on modern Android. PSTN voice goes through the
 * cloud SIP gateway; see docs/TELEPHONY.md.
 */
@CapacitorPlugin(
    name = "VoxPilotTelephony",
    permissions = [Permission(strings = [Manifest.permission.READ_PHONE_STATE], alias = "phoneState")]
)
class VoxPilotTelephonyPlugin : Plugin() {

    @PluginMethod
    fun getCallState(call: PluginCall) {
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val hasPerm = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) ==
            PackageManager.PERMISSION_GRANTED
        val ret = JSObject()
        if (!hasPerm) {
            ret.put("active", false)
            ret.put("reason", "READ_PHONE_STATE not granted")
            call.resolve(ret)
            return
        }
        @Suppress("DEPRECATION")
        val offhook = tm.callState != TelephonyManager.CALL_STATE_IDLE
        ret.put("active", offhook)
        call.resolve(ret)
    }

    @PluginMethod
    fun setSpeakerphone(call: PluginCall) {
        val on = call.getBoolean("on", false) ?: false
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        am.mode = AudioManager.MODE_IN_COMMUNICATION
        am.isSpeakerphoneOn = on
        call.resolve()
    }

    @PluginMethod
    fun notify(call: PluginCall) {
        // Minimal stub: real implementation posts via NotificationManager /
        // Capacitor LocalNotifications with a proper channel.
        call.resolve(JSObject().put("delivered", false).put("reason", "wire LocalNotifications in app shell"))
    }
}
