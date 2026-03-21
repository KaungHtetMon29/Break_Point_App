const fs = require("fs");
const path = require("path");
const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
  createRunOncePlugin,
} = require("expo/config-plugins");

const ALARM_ACTIVITY_SOURCE = `package com.breakpoint.app.alarm

import android.content.Context
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import java.util.Calendar
import java.net.HttpURLConnection
import java.net.URL

class AlarmActivity : AppCompatActivity() {
  private var ringtone: Ringtone? = null
  private var vibrator: Vibrator? = null
  private var alarmId: Int = -1
  private var alarmLabel: String = "Alarm"
  private var alarmTimeText: String = ""
  private var apiBaseUrl: String = ""
  private var authToken: String = ""
  private var prefUuid: String = ""
  private val autoStopHandler = Handler(Looper.getMainLooper())
  private val stopRunnable = Runnable {
    stopAlarm()
    finish()
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
      )
    }

    alarmId = intent.getIntExtra("id", -1)
    alarmLabel = intent.getStringExtra("label") ?: "Alarm"
    alarmTimeText = intent.getStringExtra("timeText") ?: ""
    apiBaseUrl = intent.getStringExtra("apiBaseUrl") ?: ""
    authToken = intent.getStringExtra("authToken") ?: ""
    prefUuid = intent.getStringExtra("prefUuid") ?: ""

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setBackgroundColor(0xFF1A1A1A.toInt())
      setPadding(dp(24), dp(32), dp(24), dp(40))
    }

    val topSpacer = LinearLayout(this).apply {
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        0,
        1f
      )
    }

    val timeView = TextView(this).apply {
      text = alarmTimeText.ifBlank { "Alarm" }
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 48f)
      setTypeface(typeface, Typeface.BOLD)
      setTextColor(0xFFFF8500.toInt())
      gravity = Gravity.CENTER
    }

    val labelView = TextView(this).apply {
      text = alarmLabel
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
      setTextColor(0xFFFFFFFF.toInt())
      gravity = Gravity.CENTER
      setPadding(dp(10), dp(24), dp(10), dp(28))
    }

    val buttonsContainer = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
      )
    }

    val snoozeButton = createActionButton("Snooze For 5mins").apply {
      setOnClickListener {
        snoozeForFiveMinutes()
      }
    }

    val skipButton = createActionButton("Skip").apply {
      setOnClickListener {
        recordActivity("skip")
        stopAlarm()
        finish()
      }
    }

    val breakButton = createActionButton("Take A Break").apply {
      setOnClickListener {
        recordActivity("break")
        stopAlarm()
        finish()
      }
    }

    buttonsContainer.addView(snoozeButton)
    buttonsContainer.addView(skipButton)
    buttonsContainer.addView(breakButton)

    root.addView(topSpacer)
    root.addView(timeView)
    root.addView(labelView)
    root.addView(buttonsContainer)
    root.addView(
      LinearLayout(this).apply {
        layoutParams = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          0,
          1f
        )
      }
    )
    setContentView(root)

    startAlarm()
    autoStopHandler.postDelayed(stopRunnable, 120000)
  }

  private fun startAlarm() {
    val alarmUri =
      RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    ringtone = RingtoneManager.getRingtone(this, alarmUri)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      ringtone?.audioAttributes =
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
    }
    ringtone?.play()

    vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator?.vibrate(
        VibrationEffect.createWaveform(longArrayOf(0, 600, 400, 600), 0)
      )
    } else {
      @Suppress("DEPRECATION")
      vibrator?.vibrate(longArrayOf(0, 600, 400, 600), 0)
    }
  }

  private fun createActionButton(text: String): Button {
    val buttonBackground = GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      setColor(0xFFFF8500.toInt())
      cornerRadius = dp(16).toFloat()
    }
    return Button(this).apply {
      this.text = text
      setTextColor(0xFFFFFFFF.toInt())
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
      setTypeface(typeface, Typeface.BOLD)
      isAllCaps = false
      gravity = Gravity.CENTER
      background = buttonBackground
      minHeight = dp(60)
      minimumHeight = dp(60)
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
      ).apply {
        bottomMargin = dp(14)
      }
    }
  }

  private fun snoozeForFiveMinutes() {
    recordActivity("snooze")
    val id = alarmId.takeIf { it >= 0 } ?: return run {
      stopAlarm()
      finish()
    }
    val now = Calendar.getInstance().apply {
      add(Calendar.MINUTE, 5)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    val snoozeRequestId = (((id.toLong() and 0x7FFFFFFF) + 1_000_000L) % Int.MAX_VALUE).toInt()
    AlarmSchedulerEngine.scheduleOneShot(
      this,
      now.timeInMillis,
      snoozeRequestId,
      now.get(Calendar.HOUR_OF_DAY),
      now.get(Calendar.MINUTE),
      alarmLabel,
      alarmTimeText
    )
    stopAlarm()
    finish()
  }

  private fun dp(value: Int): Int {
    return (value * resources.displayMetrics.density).toInt()
  }

  private fun stopAlarm() {
    ringtone?.stop()
    vibrator?.cancel()
    autoStopHandler.removeCallbacks(stopRunnable)
  }

  private fun recordActivity(action: String) {
    val trimmedBase = apiBaseUrl.trim().trimEnd('/')
    val trimmedToken = normalizeAuthToken(authToken)
    val trimmedPrefUuid = prefUuid.trim()
    if (trimmedBase.isEmpty() || trimmedToken.isEmpty() || trimmedPrefUuid.isEmpty()) {
      return
    }
    val alarmTimeValue = alarmTimeText.ifBlank {
      val now = Calendar.getInstance()
      String.format("%02d:%02d", now.get(Calendar.HOUR_OF_DAY), now.get(Calendar.MINUTE))
    }
    val timeBlock = getTimeBlock()
    Thread {
      val payload = JSONObject().apply {
        put("action", action)
        put("time_block", timeBlock)
        put("alarm_time", alarmTimeValue)
        put("prefernce_uuid", trimmedPrefUuid)
      }.toString()
      postActivity(buildActivityEndpoint(trimmedBase), trimmedToken, payload)
    }.start()
  }

  private fun postActivity(endpoint: String, token: String, payload: String): Boolean {
    var connection: HttpURLConnection? = null
    return try {
      connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 5000
        readTimeout = 5000
        doOutput = true
        setRequestProperty("Content-Type", "application/json")
        setRequestProperty("Authorization", "Bearer $token")
      }
      connection.outputStream.use { output ->
        output.write(payload.toByteArray(Charsets.UTF_8))
      }
      val statusCode = connection.responseCode
      statusCode in 200..299
    } catch (_: Exception) {
      false
    } finally {
      connection?.disconnect()
    }
  }

  private fun normalizeAuthToken(value: String): String {
    val trimmed = value.trim()
    if (trimmed.startsWith("Bearer ", ignoreCase = true)) {
      return trimmed.substringAfter(" ", "").trim()
    }
    return trimmed
  }

  private fun buildActivityEndpoint(baseUrl: String): String {
    if (baseUrl.endsWith("/user")) {
      return "$baseUrl/activity"
    }
    return "$baseUrl/user/activity"
  }

  private fun getTimeBlock(): String {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    return when {
      hour < 12 -> "morning"
      hour < 18 -> "evening"
      else -> "night"
    }
  }

  override fun onDestroy() {
    stopAlarm()
    super.onDestroy()
  }
}
`;

const ALARM_RECEIVER_SOURCE = `package com.breakpoint.app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val payload = intent ?: return
    val id = payload.getIntExtra("id", -1)
    val hour = payload.getIntExtra("hour", -1)
    val minute = payload.getIntExtra("minute", -1)
    val label = payload.getStringExtra("label") ?: "Alarm"
    val timeText = payload.getStringExtra("timeText") ?: ""
    val apiBaseUrl = payload.getStringExtra("apiBaseUrl") ?: ""
    val authToken = payload.getStringExtra("authToken") ?: ""
    val prefUuid = payload.getStringExtra("prefUuid") ?: ""
    val shouldReschedule = payload.getBooleanExtra("reschedule", true)

    val launchIntent = Intent(context, AlarmActivity::class.java).apply {
      putExtra("id", id)
      putExtra("hour", hour)
      putExtra("minute", minute)
      putExtra("label", label)
      putExtra("timeText", timeText)
      putExtra("apiBaseUrl", apiBaseUrl)
      putExtra("authToken", authToken)
      putExtra("prefUuid", prefUuid)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    context.startActivity(launchIntent)

    if (shouldReschedule && id >= 0 && hour in 0..23 && minute in 0..59) {
      AlarmSchedulerEngine.schedule(
        context,
        hour,
        minute,
        id,
        label,
        timeText,
        apiBaseUrl,
        authToken,
        prefUuid
      )
    }
  }
}
`;

const ALARM_BOOT_RECEIVER_SOURCE = `package com.breakpoint.app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    when (intent?.action) {
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> {
        AlarmSchedulerEngine.rescheduleAll(context)
      }
    }
  }
}
`;

const ALARM_SCHEDULER_PACKAGE_SOURCE = `package com.breakpoint.app.alarm

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AlarmSchedulerPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(AlarmSchedulerModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`;

const ALARM_SCHEDULER_MODULE_SOURCE = `package com.breakpoint.app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject
import java.util.Calendar

private const val ALARM_PREFS = "breakpoint_alarm_prefs"
private const val ALARM_STORE_KEY = "alarms"

internal object AlarmSchedulerEngine {
  private fun nextTriggerMillis(hour: Int, minute: Int): Long {
    val calendar = Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
      if (before(Calendar.getInstance())) {
        add(Calendar.DAY_OF_YEAR, 1)
      }
    }
    return calendar.timeInMillis
  }

  private fun alarmIntent(
    context: Context,
    id: Int,
    hour: Int,
    minute: Int,
    label: String,
    timeText: String,
    apiBaseUrl: String,
    authToken: String,
    prefUuid: String,
    reschedule: Boolean
  ): Intent {
    return Intent(context, AlarmReceiver::class.java).apply {
      putExtra("id", id)
      putExtra("hour", hour)
      putExtra("minute", minute)
      putExtra("label", label)
      putExtra("timeText", timeText)
      putExtra("apiBaseUrl", apiBaseUrl)
      putExtra("authToken", authToken)
      putExtra("prefUuid", prefUuid)
      putExtra("reschedule", reschedule)
    }
  }

  private fun pendingIntent(
    context: Context,
    id: Int,
    hour: Int,
    minute: Int,
    label: String,
    timeText: String,
    apiBaseUrl: String,
    authToken: String,
    prefUuid: String,
    reschedule: Boolean
  ): PendingIntent {
    val intent = alarmIntent(
      context,
      id,
      hour,
      minute,
      label,
      timeText,
      apiBaseUrl,
      authToken,
      prefUuid,
      reschedule
    )
    return PendingIntent.getBroadcast(
      context,
      id,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun loadStore(context: Context): JSONObject {
    val prefs = context.getSharedPreferences(ALARM_PREFS, Context.MODE_PRIVATE)
    val raw = prefs.getString(ALARM_STORE_KEY, null) ?: return JSONObject()
    return try {
      JSONObject(raw)
    } catch (_: Exception) {
      JSONObject()
    }
  }

  private fun saveStore(context: Context, store: JSONObject) {
    context.getSharedPreferences(ALARM_PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(ALARM_STORE_KEY, store.toString())
      .apply()
  }

  private fun saveAlarm(
    context: Context,
    id: Int,
    hour: Int,
    minute: Int,
    label: String,
    timeText: String,
    apiBaseUrl: String,
    authToken: String,
    prefUuid: String
  ) {
    val store = loadStore(context)
    val payload = JSONObject().apply {
      put("id", id)
      put("hour", hour)
      put("minute", minute)
      put("label", label)
      put("timeText", timeText)
      put("apiBaseUrl", apiBaseUrl)
      put("authToken", authToken)
      put("prefUuid", prefUuid)
    }
    store.put(id.toString(), payload)
    saveStore(context, store)
  }

  private fun removeAlarmFromStore(context: Context, id: Int) {
    val store = loadStore(context)
    store.remove(id.toString())
    saveStore(context, store)
  }

  fun schedule(
    context: Context,
    hour: Int,
    minute: Int,
    id: Int,
    label: String,
    timeText: String,
    apiBaseUrl: String,
    authToken: String,
    prefUuid: String
  ) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val triggerAt = nextTriggerMillis(hour, minute)
    val pendingIntent = pendingIntent(
      context,
      id,
      hour,
      minute,
      label,
      timeText,
      apiBaseUrl,
      authToken,
      prefUuid,
      true
    )
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        val showIntent = Intent(context, AlarmActivity::class.java)
        val showPending = PendingIntent.getActivity(
          context,
          id,
          showIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.setAlarmClock(
          AlarmManager.AlarmClockInfo(triggerAt, showPending),
          pendingIntent
        )
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
      } else {
        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
      }
    } catch (_: SecurityException) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
      } else {
        alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
      }
    }
    saveAlarm(
      context,
      id,
      hour,
      minute,
      label,
      timeText,
      apiBaseUrl,
      authToken,
      prefUuid
    )
  }

  fun scheduleOneShot(
    context: Context,
    triggerAt: Long,
    id: Int,
    hour: Int,
    minute: Int,
    label: String,
    timeText: String
  ) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pendingIntent = pendingIntent(
      context,
      id,
      hour,
      minute,
      label,
      timeText,
      "",
      "",
      "",
      false
    )
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
      } else {
        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
      }
    } catch (_: SecurityException) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
      } else {
        alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
      }
    }
  }

  fun cancel(context: Context, id: Int) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pendingIntent = pendingIntent(
      context,
      id,
      0,
      0,
      "",
      "",
      "",
      "",
      "",
      true
    )
    alarmManager.cancel(pendingIntent)
    removeAlarmFromStore(context, id)
  }

  fun rescheduleAll(context: Context) {
    val store = loadStore(context)
    val keys = store.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      val payload = store.optJSONObject(key) ?: continue
      schedule(
        context,
        payload.optInt("hour", 0),
        payload.optInt("minute", 0),
        payload.optInt("id", -1),
        payload.optString("label", "Alarm"),
        payload.optString("timeText", ""),
        payload.optString("apiBaseUrl", ""),
        payload.optString("authToken", ""),
        payload.optString("prefUuid", "")
      )
    }
  }
}

class AlarmSchedulerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "AlarmScheduler"

  @ReactMethod
  fun scheduleDailyAlarm(
    hour: Int,
    minute: Int,
    id: Int,
    label: String,
    timeText: String,
    apiBaseUrl: String,
    authToken: String,
    prefUuid: String
  ) {
    AlarmSchedulerEngine.schedule(
      reactContext,
      hour,
      minute,
      id,
      label,
      timeText,
      apiBaseUrl,
      authToken,
      prefUuid
    )
  }

  @ReactMethod
  fun cancelAlarm(id: Int) {
    AlarmSchedulerEngine.cancel(reactContext, id)
  }

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      promise.resolve(alarmManager.canScheduleExactAlarms())
      return
    }
    promise.resolve(true)
  }

  @ReactMethod
  fun requestExactAlarmPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
      data = Uri.parse("package:\${reactContext.packageName}")
      flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }
    reactContext.startActivity(intent)
  }
}
`;

function writeAlarmFiles(projectRoot) {
  const alarmDir = path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "java",
    "com",
    "breakpoint",
    "app",
    "alarm"
  );
  fs.mkdirSync(alarmDir, { recursive: true });
  fs.writeFileSync(path.join(alarmDir, "AlarmActivity.kt"), ALARM_ACTIVITY_SOURCE);
  fs.writeFileSync(path.join(alarmDir, "AlarmReceiver.kt"), ALARM_RECEIVER_SOURCE);
  fs.writeFileSync(path.join(alarmDir, "AlarmBootReceiver.kt"), ALARM_BOOT_RECEIVER_SOURCE);
  fs.writeFileSync(path.join(alarmDir, "AlarmSchedulerModule.kt"), ALARM_SCHEDULER_MODULE_SOURCE);
  fs.writeFileSync(path.join(alarmDir, "AlarmSchedulerPackage.kt"), ALARM_SCHEDULER_PACKAGE_SOURCE);
}

function addImportIfMissing(source, line) {
  if (source.includes(line)) return source;
  const anchor = "import com.facebook.react.defaults.DefaultReactNativeHost";
  if (source.includes(anchor)) {
    return source.replace(anchor, `${anchor}\n${line}`);
  }
  return `${line}\n${source}`;
}

function addAlarmPackageRegistration(source) {
  if (source.includes("add(AlarmSchedulerPackage())")) return source;
  const marker = "PackageList(this).packages.apply {";
  if (!source.includes(marker)) return source;
  return source.replace(marker, `${marker}\n              add(AlarmSchedulerPackage())`);
}

const withAlarmManifest = (config) =>
  withAndroidManifest(config, (configMod) => {
    const manifest = configMod.modResults;
    manifest.manifest["uses-permission"] = manifest.manifest["uses-permission"] || [];
    const hasBootPermission = manifest.manifest["uses-permission"].some(
      (entry) => entry.$["android:name"] === "android.permission.RECEIVE_BOOT_COMPLETED"
    );
    if (!hasBootPermission) {
      manifest.manifest["uses-permission"].push({
        $: { "android:name": "android.permission.RECEIVE_BOOT_COMPLETED" },
      });
    }
    const app = manifest.manifest.application?.[0];
    if (!app) return configMod;
    app.activity = app.activity || [];
    const hasAlarmActivity = app.activity.some(
      (entry) => entry.$["android:name"] === ".alarm.AlarmActivity"
    );
    if (!hasAlarmActivity) {
      app.activity.push({
        $: {
          "android:name": ".alarm.AlarmActivity",
          "android:exported": "false",
          "android:showWhenLocked": "true",
          "android:turnScreenOn": "true",
          "android:excludeFromRecents": "true",
          "android:launchMode": "singleTask",
        },
      });
    }
    app.receiver = app.receiver || [];
    const hasAlarmReceiver = app.receiver.some(
      (entry) => entry.$["android:name"] === ".alarm.AlarmReceiver"
    );
    if (!hasAlarmReceiver) {
      app.receiver.push({
        $: {
          "android:name": ".alarm.AlarmReceiver",
          "android:enabled": "true",
          "android:exported": "false",
        },
      });
    }
    const hasBootReceiver = app.receiver.some(
      (entry) => entry.$["android:name"] === ".alarm.AlarmBootReceiver"
    );
    if (!hasBootReceiver) {
      app.receiver.push({
        $: {
          "android:name": ".alarm.AlarmBootReceiver",
          "android:enabled": "true",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.intent.action.BOOT_COMPLETED" } },
              { $: { "android:name": "android.intent.action.MY_PACKAGE_REPLACED" } },
            ],
          },
        ],
      });
    }
    return configMod;
  });

const withAlarmMainApplication = (config) =>
  withMainApplication(config, (configMod) => {
    let source = configMod.modResults.contents;
    source = addImportIfMissing(source, "import com.breakpoint.app.alarm.AlarmSchedulerPackage");
    source = addAlarmPackageRegistration(source);
    configMod.modResults.contents = source;
    return configMod;
  });

const withAlarmFiles = (config) =>
  withDangerousMod(config, [
    "android",
    async (configMod) => {
      writeAlarmFiles(configMod.modRequest.projectRoot);
      return configMod;
    },
  ]);

const withAlarmNative = (config) => {
  config = withAlarmManifest(config);
  config = withAlarmMainApplication(config);
  config = withAlarmFiles(config);
  return config;
};

module.exports = createRunOncePlugin(withAlarmNative, "with-alarm-native", "1.0.0");
