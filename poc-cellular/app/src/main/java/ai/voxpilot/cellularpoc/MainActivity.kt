package ai.voxpilot.cellularpoc

import android.Manifest
import android.app.role.RoleManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.TelecomManager
import android.telephony.TelephonyManager
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private val REQ_PERMS = 100

    private fun runtimePerms(): Array<String> {
        val list = mutableListOf(
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CALL_PHONE,
        )
        if (Build.VERSION.SDK_INT >= 33) list.add(Manifest.permission.POST_NOTIFICATIONS)
        return list.toTypedArray()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        CallSession.log("POC started on ${Build.MANUFACTURER} ${Build.MODEL} API ${Build.VERSION.SDK_INT}")

        findViewById<Button>(R.id.btnRole).setOnClickListener { requestDialerRole() }
        findViewById<Button>(R.id.btnPerms).setOnClickListener {
            ActivityCompat.requestPermissions(this, runtimePerms(), REQ_PERMS)
        }
        findViewById<Button>(R.id.btnPlaceCall).setOnClickListener { placeTestCall() }
        findViewById<Button>(R.id.btnCallScreen).setOnClickListener {
            startActivity(Intent(this, CallActivity::class.java))
        }
        findViewById<CheckBox>(R.id.cbAutoAnswer).setOnCheckedChangeListener { _, on ->
            CallSession.autoAnswer = on
            CallSession.log("auto-answer ${if (on) "ENABLED" else "disabled"}")
        }
        findViewById<Button>(R.id.btnCopyReport).setOnClickListener { copyReport() }
        findViewById<Button>(R.id.btnClearLog).setOnClickListener { CallSession.clearLog() }

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    CallSession.log.collect { lines ->
                        findViewById<TextView>(R.id.tvLog).text =
                            if (lines.isEmpty()) "(log)" else lines.joinToString("\n")
                        findViewById<ScrollView>(R.id.scrollLog).post {
                            findViewById<ScrollView>(R.id.scrollLog)
                                .fullScroll(ScrollView.FOCUS_DOWN)
                        }
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
        findViewById<CheckBox>(R.id.cbAutoAnswer).isChecked = CallSession.autoAnswer
    }

    private fun refreshStatus() {
        val rm = getSystemService(RoleManager::class.java)
        val held = try { rm.isRoleHeld(RoleManager.ROLE_DIALER) } catch (_: Throwable) { false }
        findViewById<TextView>(R.id.tvStatusDialer).text =
            "Default dialer: ${if (held) "✓ YES (POC controls calls)" else "✗ no — tap button 1"}"

        val missing = runtimePerms().filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        findViewById<TextView>(R.id.tvStatusPerms).text =
            if (missing.isEmpty()) "Permissions: ✓ all granted"
            else "Permissions: ✗ missing ${missing.size} — tap button 2"

        val tm = getSystemService(TelephonyManager::class.java)
        val sim = try {
            val ready = tm.simState == TelephonyManager.SIM_STATE_READY
            val op = try { tm.networkOperatorName } catch (_: Throwable) { "?" }
            "${if (ready) "✓ READY" else "✗ NOT READY"} phones=${tm.phoneCount} op=$op"
        } catch (t: Throwable) { "error: ${t.message}" }
        findViewById<TextView>(R.id.tvStatusSim).text = "SIM: $sim"
    }

    private fun requestDialerRole() {
        try {
            val rm = getSystemService(RoleManager::class.java)
            if (rm.isRoleHeld(RoleManager.ROLE_DIALER)) {
                Toast.makeText(this, "Already the default Phone app", Toast.LENGTH_SHORT).show()
                return
            }
            CallSession.log("requesting ROLE_DIALER…")
            rm.requestRole(RoleManager.ROLE_DIALER, mainExecutor) { granted ->
                CallSession.log("ROLE_DIALER granted=$granted")
                if (!granted) {
                    CallSession.log("If the prompt failed: Settings → Apps → Default apps → Phone app → VoxPilot POC")
                }
                refreshStatus()
            }
        } catch (t: Throwable) {
            CallSession.log("role request FAILED: ${t.message}")
        }
    }

    private fun placeTestCall() {
        val num = findViewById<EditText>(R.id.etNumber).text.toString().trim()
        if (num.length < 7) {
            Toast.makeText(this, "Enter your 2nd phone's number first", Toast.LENGTH_SHORT).show()
            return
        }
        try {
            val tm = getSystemService(TelecomManager::class.java)
            CallSession.log("placeCall via SIM → $num")
            tm.placeCall(Uri.fromParts("tel", num, null), Bundle())
        } catch (t: SecurityException) {
            CallSession.log("placeCall DENIED (SecurityException): ${t.message}")
            CallSession.log("Fix: grant CALL_PHONE permission AND set POC as default Phone app")
        } catch (t: Throwable) {
            CallSession.log("placeCall FAILED: ${t.message}")
        }
    }

    private fun copyReport() {
        val report = CallSession.buildReport()
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("poc-report", report))
        Toast.makeText(this, "Report copied — paste it back to chat", Toast.LENGTH_LONG).show()
        CallSession.log("report copied to clipboard (${report.length} chars)")
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_PERMS) {
            permissions.forEachIndexed { i, p ->
                val ok = grantResults.getOrNull(i) == PackageManager.PERMISSION_GRANTED
                CallSession.log("perm ${p.substringAfterLast('.')} → ${if (ok) "granted" else "DENIED"}")
            }
            refreshStatus()
        }
    }
}
