package ai.voxpilot.cellularpoc

import android.os.Build
import android.telecom.Call
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Shared POC state: current call, audio meters, event log, verdicts. */
object CallSession {
    data class Levels(
        val source: String,
        val rms: Double,
        val peak: Double,
        val samples: Long,
        val running: Boolean,
    )

    data class UiState(
        val hasCall: Boolean = false,
        val state: String = "IDLE",
        val number: String = "—",
        val canAnswer: Boolean = false,
    )

    private val _ui = MutableStateFlow(UiState())
    val ui: StateFlow<UiState> = _ui.asStateFlow()

    private val _levels = MutableStateFlow(Levels("—", 0.0, 0.0, 0, false))
    val levels: StateFlow<Levels> = _levels.asStateFlow()

    private val _log = MutableStateFlow<List<String>>(emptyList())
    val log: StateFlow<List<String>> = _log.asStateFlow()

    @Volatile var currentCall: Call? = null
    @Volatile var autoAnswer: Boolean = false
    @Volatile var txResult: String = "not tested"

    private val time = SimpleDateFormat("HH:mm:ss", Locale.US)

    fun log(msg: String) {
        val line = "${time.format(Date())} $msg"
        _log.value = (_log.value + line).takeLast(300)
    }

    fun clearLog() { _log.value = emptyList() }

    fun updateUi(state: UiState) { _ui.value = state }
    fun updateLevels(l: Levels) { _levels.value = l }

    fun stateName(s: Int): String = when (s) {
        Call.STATE_NEW -> "NEW"
        Call.STATE_DIALING -> "DIALING"
        Call.STATE_RINGING -> "RINGING"
        Call.STATE_HOLDING -> "HOLDING"
        Call.STATE_ACTIVE -> "ACTIVE"
        Call.STATE_DISCONNECTED -> "DISCONNECTED"
        Call.STATE_CONNECTING -> "CONNECTING"
        Call.STATE_DISCONNECTING -> "DISCONNECTING"
        Call.STATE_SELECT_PHONE_ACCOUNT -> "SELECT_PHONE_ACCOUNT"
        else -> "STATE($s)"
    }

    fun buildReport(): String {
        val sb = StringBuilder()
        sb.appendLine("VOXPILOT CELLULAR POC — RESULT REPORT")
        sb.appendLine("device=${Build.MANUFACTURER} ${Build.MODEL}")
        sb.appendLine("android=API ${Build.VERSION.SDK_INT} (${Build.VERSION.RELEASE})")
        sb.appendLine("txVerdict=$txResult")
        sb.appendLine("--- LOG ---")
        _log.value.forEach { sb.appendLine(it) }
        sb.appendLine("--- END ---")
        return sb.toString()
    }
}
