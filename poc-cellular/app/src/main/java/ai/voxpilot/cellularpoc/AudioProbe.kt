package ai.voxpilot.cellularpoc

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.sqrt

/**
 * RX test: tries to capture call audio from several sources during an ACTIVE
 * carrier call and reports measured levels. Silence on all sources =
 * stock-Android capture restriction (the expected result).
 */
object AudioProbe {
    private var job: Job? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    data class SourceAttempt(val name: String, val source: Int)

    val SOURCES = listOf(
        SourceAttempt("VOICE_CALL", MediaRecorder.AudioSource.VOICE_CALL),
        SourceAttempt("VOICE_COMMUNICATION", MediaRecorder.AudioSource.VOICE_COMMUNICATION),
        SourceAttempt("MIC", MediaRecorder.AudioSource.MIC),
    )
    var sourceIndex: Int = 0

    fun currentSourceName(): String = SOURCES[sourceIndex % SOURCES.size].name
    fun cycleSource() { sourceIndex = (sourceIndex + 1) % SOURCES.size }

    fun isRunning(): Boolean = job?.isActive == true

    fun start() {
        if (job?.isActive == true) return
        val attempt = SOURCES[sourceIndex % SOURCES.size]
        job = scope.launch {
            val sr = 16000
            val minBuf = AudioRecord.getMinBufferSize(
                sr, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT
            )
            CallSession.log("RX probe: source=${attempt.name} minBuf=$minBuf")
            val rec = try {
                AudioRecord.Builder()
                    .setAudioSource(attempt.source)
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setSampleRate(sr)
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(minBuf * 4)
                    .build()
            } catch (t: Throwable) {
                CallSession.log("RX probe: create FAILED (${attempt.name}): ${t.message}")
                null
            }
            if (rec == null || rec.state != AudioRecord.STATE_INITIALIZED) {
                CallSession.log("RX probe: NOT INITIALIZED (${attempt.name}) state=${rec?.state}")
                try { rec?.release() } catch (_: Throwable) {}
                return@launch
            }
            try {
                rec.startRecording()
            } catch (t: Throwable) {
                CallSession.log("RX probe: startRecording FAILED: ${t.message}")
                try { rec.release() } catch (_: Throwable) {}
                return@launch
            }
            if (rec.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
                CallSession.log("RX probe: recordingState != RECORDING (${rec.recordingState})")
                try { rec.release() } catch (_: Throwable) {}
                return@launch
            }
            CallSession.log("RX probe: recording from ${attempt.name} — ask other person to TALK")
            val buf = ShortArray(2048)
            var total = 0L
            var lastEmit = 0L
            try {
                while (isActive) {
                    val n = rec.read(buf, 0, buf.size)
                    if (n > 0) {
                        total += n
                        var sum = 0.0
                        var peak = 0
                        for (i in 0 until n) {
                            val s = buf[i].toInt()
                            sum += s * s
                            val a = if (s < 0) -s else s
                            if (a > peak) peak = a
                        }
                        val rms = sqrt(sum / n) / 32768.0
                        val now = System.currentTimeMillis()
                        if (now - lastEmit > 250) {
                            lastEmit = now
                            CallSession.updateLevels(
                                CallSession.Levels(attempt.name, rms, peak / 32768.0, total, true)
                            )
                        }
                    } else if (n < 0) {
                        CallSession.log("RX probe: read error code=$n")
                        delay(300)
                    }
                }
            } finally {
                try { rec.stop() } catch (_: Throwable) {}
                try { rec.release() } catch (_: Throwable) {}
                CallSession.log("RX probe: stopped (${attempt.name}) totalSamples=$total")
                CallSession.updateLevels(CallSession.Levels(attempt.name, 0.0, 0.0, total, false))
            }
        }
    }

    fun stop() {
        job?.cancel()
        job = null
    }
}
