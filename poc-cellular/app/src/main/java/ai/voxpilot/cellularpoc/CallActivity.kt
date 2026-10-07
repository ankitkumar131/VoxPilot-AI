package ai.voxpilot.cellularpoc

import android.content.Context
import android.media.AudioManager
import android.os.Bundle
import android.telecom.VideoProfile
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CallActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setShowWhenLocked(true)
        setTurnScreenOn(true)
        setContentView(R.layout.activity_call)

        findViewById<Button>(R.id.btnAnswer).setOnClickListener {
            try {
                CallSession.currentCall?.answer(VideoProfile.STATE_AUDIO_ONLY)
                CallSession.log("answer() called")
            } catch (t: Throwable) {
                CallSession.log("answer FAILED: ${t.message}")
            }
        }
        findViewById<Button>(R.id.btnHangup).setOnClickListener {
            try {
                CallSession.currentCall?.disconnect()
                CallSession.log("disconnect() called")
            } catch (t: Throwable) {
                CallSession.log("disconnect FAILED: ${t.message}")
            }
        }
        findViewById<Button>(R.id.btnSpeaker).setOnClickListener { toggleSpeaker() }
        findViewById<Button>(R.id.btnProbeStart).setOnClickListener {
            CallSession.log("RX probe START requested (source=${AudioProbe.currentSourceName()})")
            AudioProbe.start()
        }
        findViewById<Button>(R.id.btnProbeStop).setOnClickListener { AudioProbe.stop() }
        findViewById<Button>(R.id.btnProbeSource).setOnClickListener {
            AudioProbe.cycleSource()
            (it as Button).text = "Src"
            CallSession.log("RX source → ${AudioProbe.currentSourceName()} (restart probe to use)")
        }
        findViewById<Button>(R.id.btnToneModern).setOnClickListener { TonePlayer.playModern(this) }
        findViewById<Button>(R.id.btnToneLegacy).setOnClickListener { TonePlayer.playLegacy(this) }
        findViewById<Button>(R.id.btnHeardYes).setOnClickListener { recordTx(true) }
        findViewById<Button>(R.id.btnHeardNo).setOnClickListener { recordTx(false) }
        findViewById<Button>(R.id.btnClose).setOnClickListener { finish() }

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    CallSession.ui.collect { u ->
                        findViewById<TextView>(R.id.tvCallNumber).text = u.number
                        findViewById<TextView>(R.id.tvCallState).text =
                            if (u.hasCall) "State: ${u.state}" else "No call (start one from main screen)"
                        findViewById<Button>(R.id.btnAnswer).isEnabled = u.canAnswer
                    }
                }
                launch {
                    CallSession.levels.collect { l ->
                        val bar = levelBar(l.rms)
                        findViewById<TextView>(R.id.tvLevels).text =
                            "src=${l.source} rms=${"%.3f".format(l.rms)} peak=${"%.3f".format(l.peak)}\n" +
                                "samples=${l.samples} ${if (l.running) "● LIVE" else "○ stopped"}\n$bar"
                    }
                }
            }
        }
        refreshTxLabel()
    }

    private fun toggleSpeaker() {
        try {
            val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            am.mode = AudioManager.MODE_IN_COMMUNICATION
            am.isSpeakerphoneOn = !am.isSpeakerphoneOn
            (findViewById<Button>(R.id.btnSpeaker)).text =
                if (am.isSpeakerphoneOn) "Earpiece" else "Speaker"
            CallSession.log("routing: speaker=${am.isSpeakerphoneOn} (routing control works; ≠ audio access)")
        } catch (t: Throwable) {
            CallSession.log("speaker toggle FAILED: ${t.message}")
        }
    }

    private fun recordTx(heard: Boolean) {
        val stamp = SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())
        CallSession.txResult = if (heard) "HEARD ✓ (at $stamp)" else "NOT heard ✗ (at $stamp)"
        CallSession.log("TX verdict recorded: ${CallSession.txResult}")
        refreshTxLabel()
    }

    private fun refreshTxLabel() {
        findViewById<TextView>(R.id.tvTxResult).text = "TX result: ${CallSession.txResult}"
    }

    private fun levelBar(rms: Double): String {
        val n = (rms * 30).toInt().coerceIn(0, 30)
        return "[" + "#".repeat(n) + "-".repeat(30 - n) + "]"
    }
}
