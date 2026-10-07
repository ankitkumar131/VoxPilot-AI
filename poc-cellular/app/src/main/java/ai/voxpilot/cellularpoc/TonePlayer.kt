package ai.voxpilot.cellularpoc

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * TX test: plays a loud test tone during an ACTIVE carrier call.
 * The person on the other phone confirms heard / not heard (manual verdict
 * buttons in CallActivity). Two paths are attempted: modern attributes and
 * the legacy STREAM_VOICE_CALL stream.
 */
object TonePlayer {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private fun sine(freqHz: Double, seconds: Int, sr: Int): ShortArray {
        val n = seconds * sr
        val out = ShortArray(n)
        for (i in 0 until n) {
            val t = i.toDouble() / sr
            val env = minOf(1.0, t * 20.0, (seconds - t) * 20.0).coerceIn(0.0, 1.0)
            out[i] = (kotlin.math.sin(2 * Math.PI * freqHz * t) * 20000 * env).toInt().toShort()
        }
        return out
    }

    fun playModern(ctx: Context) {
        scope.launch {
            val am = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val prevMode = am.mode
            try {
                am.mode = AudioManager.MODE_IN_COMMUNICATION
                val sr = 16000
                val tone = sine(440.0, 3, sr)
                val track = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setSampleRate(sr)
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(tone.size * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()
                CallSession.log("TX tone A (modern voice-comm): trackState=${track.state} (1=static ok)")
                track.write(tone, 0, tone.size)
                track.play()
                CallSession.log("TX tone A playing 3s @440Hz — ask: DO YOU HEAR IT?")
                delay(3200)
                try { track.stop(); track.release() } catch (_: Throwable) {}
                CallSession.log("TX tone A finished — record verdict with the buttons.")
            } catch (t: Throwable) {
                CallSession.log("TX tone A FAILED: ${t.message}")
            } finally {
                try { am.mode = prevMode } catch (_: Throwable) {}
            }
        }
    }

    @Suppress("DEPRECATION")
    fun playLegacy(ctx: Context) {
        scope.launch {
            val am = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val prevMode = am.mode
            try {
                am.mode = AudioManager.MODE_IN_CALL
                val sr = 16000
                val tone = sine(880.0, 3, sr)
                val minBuf = AudioTrack.getMinBufferSize(
                    sr, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT
                )
                val track = AudioTrack(
                    AudioManager.STREAM_VOICE_CALL, sr, AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT, maxOf(minBuf, tone.size * 2),
                    AudioTrack.MODE_STATIC
                )
                CallSession.log("TX tone B (legacy STREAM_VOICE_CALL): trackState=${track.state}")
                track.write(tone, 0, tone.size)
                track.play()
                CallSession.log("TX tone B playing 3s @880Hz — ask: DO YOU HEAR IT?")
                delay(3200)
                try { track.stop(); track.release() } catch (_: Throwable) {}
                CallSession.log("TX tone B finished — record verdict with the buttons.")
            } catch (t: Throwable) {
                CallSession.log("TX tone B FAILED: ${t.message}")
            } finally {
                try { am.mode = prevMode } catch (_: Throwable) {}
            }
        }
    }
}
