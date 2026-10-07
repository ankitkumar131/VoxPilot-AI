package ai.voxpilot.cellularpoc

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.telecom.Call
import android.telecom.InCallService
import android.telecom.VideoProfile
import androidx.core.app.NotificationCompat

/**
 * System-bound call UI service. Active ONLY while this app holds the
 * default-dialer role. Tracks calls, brings up the test UI, handles
 * auto-answer for the inbound experiment.
 */
class VoxInCallService : InCallService() {

    override fun onCreate() {
        super.onCreate()
        CallSession.setServiceAlive(true)
        CallSession.log("SERVICE BOUND by Telecom (InCallService alive)")
    }

    override fun onDestroy() {
        CallSession.log("SERVICE UNBOUND (InCallService destroyed)")
        CallSession.setServiceAlive(false)
        super.onDestroy()
    }

    private val cb = object : Call.Callback() {
        override fun onStateChanged(call: Call, state: Int) {
            onCallState(call, state)
        }
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        CallSession.log("InCallService: call added (our service is managing this call)")
        call.registerCallback(cb)
        CallSession.currentCall = call
        onCallState(call, call.state)

        if (CallSession.autoAnswer && call.state == Call.STATE_RINGING) {
            CallSession.log("auto-answer: will answer in 1s…")
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    call.answer(VideoProfile.STATE_AUDIO_ONLY)
                    CallSession.log("auto-answer: answer() called OK")
                } catch (t: Throwable) {
                    CallSession.log("auto-answer FAILED: ${t.message}")
                }
            }, 1000)
        }

        showCallUi(call)
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        CallSession.log("InCallService: call removed")
        try { call.unregisterCallback(cb) } catch (_: Throwable) {}
        AudioProbe.stop()
        if (CallSession.currentCall == call) CallSession.currentCall = null
        CallSession.updateUi(CallSession.UiState())
        cancelCallNotification()
    }

    private fun onCallState(call: Call, state: Int) {
        val num = try {
            call.details?.handle?.schemeSpecificPart ?: "unknown"
        } catch (_: Throwable) { "unknown" }
        CallSession.log("call state → ${CallSession.stateName(state)} number=$num")
        CallSession.updateUi(
            CallSession.UiState(
                hasCall = true,
                state = CallSession.stateName(state),
                number = num,
                canAnswer = state == Call.STATE_RINGING,
            )
        )
    }

    /** Bring up CallActivity: direct launch when possible + full-screen notification. */
    private fun showCallUi(call: Call) {
        val intent = Intent(this, CallActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            startActivity(intent)
        } catch (t: Throwable) {
            CallSession.log("direct CallActivity launch blocked (${t.message}); using notification")
        }
        postCallNotification()
    }

    private fun postCallNotification() {
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                "poc_calls", "POC calls", NotificationManager.IMPORTANCE_HIGH
            )
            nm.createNotificationChannel(channel)
            val fullScreen = Intent(this, CallActivity::class.java)
            val pi = PendingIntent.getActivity(
                this, 0, fullScreen,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val notif = NotificationCompat.Builder(this, "poc_calls")
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentTitle("POC call in progress")
                .setContentText("Tap to open the audio test screen")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setOngoing(true)
                .setContentIntent(pi)
                .setFullScreenIntent(pi, true)
                .build()
            nm.notify(1001, notif)
        } catch (t: Throwable) {
            CallSession.log("call notification FAILED: ${t.message}")
        }
    }

    private fun cancelCallNotification() {
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(1001)
        } catch (_: Throwable) {}
    }
}
