package uy.com.polooeste.handheld;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;

import org.json.JSONObject;

import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MonitorService extends Service implements SensorEventListener {
    private static final String CHANNEL_ID = "polo_oeste_monitor";
    private static final int NOTIFICATION_ID = 801;
    private static final long INACTIVITY_LIMIT_MS = 30L * 60L * 1000L;
    private static final long HEARTBEAT_INTERVAL_MS = 30_000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private SensorManager sensorManager;
    private Sensor accelerometer;
    private String baseUrl = "";
    private String token = "";
    private long lastMovement = System.currentTimeMillis();
    private long lastAcceptedSensorEvent = 0;
    private boolean alarmActive = false;
    private MediaPlayer alarmPlayer;
    private Vibrator vibrator;

    private final Runnable heartbeat = new Runnable() {
        @Override
        public void run() {
            checkInactivity();
            sendHeartbeat();
            handler.postDelayed(this, HEARTBEAT_INTERVAL_MS);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        if (accelerometer != null) {
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_NORMAL);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        baseUrl = intent.getStringExtra("server");
        token = intent.getStringExtra("token");
        if (baseUrl == null || token == null || baseUrl.isEmpty() || token.isEmpty()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        startForeground(NOTIFICATION_ID, buildNotification("Monitoreo activo"));
        handler.removeCallbacks(heartbeat);
        handler.post(heartbeat);
        return START_STICKY;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_ACCELEROMETER) return;
        float x = event.values[0];
        float y = event.values[1];
        float z = event.values[2];
        double magnitude = Math.sqrt(x * x + y * y + z * z);
        long now = System.currentTimeMillis();
        if (Math.abs(magnitude - SensorManager.GRAVITY_EARTH) > 1.15 &&
                now - lastAcceptedSensorEvent > 1500) {
            lastAcceptedSensorEvent = now;
            lastMovement = now;
            if (alarmActive) {
                stopAlarm();
                sendHeartbeat();
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // No se requiere una reacción específica ante cambios de precisión.
    }

    private void checkInactivity() {
        if (!alarmActive && System.currentTimeMillis() - lastMovement >= INACTIVITY_LIMIT_MS) {
            activateAlarm();
        }
    }

    private void activateAlarm() {
        alarmActive = true;
        AudioManager audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        int maximum = audio.getStreamMaxVolume(AudioManager.STREAM_ALARM);
        audio.setStreamVolume(AudioManager.STREAM_ALARM, maximum, 0);

        try {
            alarmPlayer = MediaPlayer.create(
                    this,
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                    null,
                    new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build(),
                    0
            );
            if (alarmPlayer != null) {
                alarmPlayer.setLooping(true);
                alarmPlayer.start();
            }
        } catch (Exception ignored) {
            alarmPlayer = null;
        }

        if (vibrator != null && vibrator.hasVibrator()) {
            long[] pattern = {0, 700, 350, 700};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        }
        updateNotification("Alarma antipérdida activa");
    }

    private void stopAlarm() {
        alarmActive = false;
        if (alarmPlayer != null) {
            try {
                alarmPlayer.stop();
                alarmPlayer.release();
            } catch (Exception ignored) {
                // El reproductor ya estaba cerrado.
            }
            alarmPlayer = null;
        }
        if (vibrator != null) vibrator.cancel();
        updateNotification("Movimiento detectado · monitoreo activo");
    }

    private void sendHeartbeat() {
        final int battery = readBatteryPercentage();
        final String movementIso = Instant.ofEpochMilli(lastMovement).toString();
        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("bateria", battery);
                body.put("ultimo_movimiento", movementIso);
                body.put("alarma_activa", alarmActive);
                new ApiClient(baseUrl, token).post("/api/android/heartbeat", body);
            } catch (Exception ignored) {
                // El próximo heartbeat vuelve a intentar la sincronización.
            }
        });
    }

    private int readBatteryPercentage() {
        Intent batteryStatus = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (batteryStatus == null) return 100;
        int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
        if (level < 0 || scale <= 0) return 100;
        return Math.max(0, Math.min(100, Math.round(level * 100f / scale)));
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Monitoreo del handheld",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Mantiene activa la batería y la alarma antipérdida.");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String text) {
        Intent openApp = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                openApp,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        return builder
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("Polo Oeste Handheld")
                .setContentText(text)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build();
    }

    private void updateNotification(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        manager.notify(NOTIFICATION_ID, buildNotification(text));
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(heartbeat);
        if (sensorManager != null) sensorManager.unregisterListener(this);
        stopAlarm();
        executor.shutdownNow();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
