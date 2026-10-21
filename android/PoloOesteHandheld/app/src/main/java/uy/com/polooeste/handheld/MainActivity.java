package uy.com.polooeste.handheld;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String PREFS = "polo_oeste_handheld";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler(Looper.getMainLooper());

    private SharedPreferences preferences;
    private LinearLayout loginPanel;
    private LinearLayout activityPanel;
    private EditText serverInput;
    private EditText userInput;
    private EditText passwordInput;
    private EditText collectorInput;
    private Spinner activitySpinner;
    private TextView connectionLabel;
    private TextView userLabel;
    private TextView stateLabel;
    private TextView timeLabel;
    private TextView pauseLabel;
    private TextView messageLabel;
    private Button loginButton;
    private Button toggleButton;
    private Button finishButton;

    private String baseUrl = "";
    private String token = "";
    private String funcionario = "";
    private String collector = "";
    private boolean hasActivity = false;
    private boolean active = false;
    private long elapsedSeconds = 0;
    private long stateReceivedAt = 0;
    private int pauses = 0;
    private final List<ActivityOption> activities = new ArrayList<>();

    private final Runnable clock = new Runnable() {
        @Override
        public void run() {
            long visibleSeconds = elapsedSeconds;
            if (active && stateReceivedAt > 0) {
                visibleSeconds += Math.max(0, (System.currentTimeMillis() - stateReceivedAt) / 1000);
            }
            timeLabel.setText(formatTime(visibleSeconds));
            handler.postDelayed(this, 1000);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        preferences = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        bindViews();
        restoreInputs();
        bindActions();
        requestNotificationPermission();

        token = preferences.getString("token", "");
        baseUrl = preferences.getString("server", "");
        funcionario = preferences.getString("funcionario", "");
        collector = preferences.getString("collector", "");
        if (!token.isEmpty() && !baseUrl.isEmpty()) {
            showActivityPanel();
            startMonitor();
            refreshState();
        }
        handler.post(clock);
    }

    private void bindViews() {
        loginPanel = findViewById(R.id.loginPanel);
        activityPanel = findViewById(R.id.activityPanel);
        serverInput = findViewById(R.id.serverInput);
        userInput = findViewById(R.id.userInput);
        passwordInput = findViewById(R.id.passwordInput);
        collectorInput = findViewById(R.id.collectorInput);
        activitySpinner = findViewById(R.id.activitySpinner);
        connectionLabel = findViewById(R.id.connectionLabel);
        userLabel = findViewById(R.id.userLabel);
        stateLabel = findViewById(R.id.stateLabel);
        timeLabel = findViewById(R.id.timeLabel);
        pauseLabel = findViewById(R.id.pauseLabel);
        messageLabel = findViewById(R.id.messageLabel);
        loginButton = findViewById(R.id.loginButton);
        toggleButton = findViewById(R.id.toggleButton);
        finishButton = findViewById(R.id.finishButton);
    }

    private void restoreInputs() {
        serverInput.setText(preferences.getString("server", "http://192.168.1.100:8765"));
        userInput.setText(preferences.getString("username", ""));
        collectorInput.setText(preferences.getString("collector", ""));
        loadActivities(preferences.getString("activities", "[]"));
    }

    private void bindActions() {
        loginButton.setOnClickListener(view -> login());
        toggleButton.setOnClickListener(view -> toggleActivity());
        finishButton.setOnClickListener(view -> new AlertDialog.Builder(this)
                .setTitle("Finalizar actividad")
                .setMessage("¿Querés cerrar definitivamente este registro?")
                .setNegativeButton("Cancelar", null)
                .setPositiveButton("Finalizar", (dialog, which) -> finishActivity())
                .show());
        findViewById(R.id.logoutButton).setOnClickListener(view -> logout());
    }

    private void login() {
        String server = normalizeServer(serverInput.getText().toString());
        String username = userInput.getText().toString().trim();
        String password = passwordInput.getText().toString();
        String collectorValue = collectorInput.getText().toString().trim().toUpperCase(Locale.ROOT);
        if (server.isEmpty() || username.isEmpty() || password.isEmpty() || collectorValue.isEmpty()) {
            showMessage("Completá servidor, usuario, contraseña y colector.");
            return;
        }

        setBusy(loginButton, true);
        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("usuario", username);
                body.put("contrasena", password);
                body.put("colector", collectorValue);
                body.put("dispositivo_id", Settings.Secure.getString(
                        getContentResolver(), Settings.Secure.ANDROID_ID));
                JSONObject response = new ApiClient(server, "")
                        .post("/api/android/login", body);
                baseUrl = server;
                token = response.getString("token");
                funcionario = response.optString("funcionario", username);
                collector = response.optString("colector", collectorValue);
                JSONArray activityList = response.optJSONArray("actividades");
                String serializedActivities = activityList == null
                        ? "[]" : activityList.toString();
                preferences.edit()
                        .putString("server", baseUrl)
                        .putString("username", username)
                        .putString("collector", collector)
                        .putString("funcionario", funcionario)
                        .putString("token", token)
                        .putString("activities", serializedActivities)
                        .apply();
                handler.post(() -> {
                    loadActivities(serializedActivities);
                    passwordInput.setText("");
                    showActivityPanel();
                    startMonitor();
                    refreshState();
                    showMessage("");
                });
            } catch (Exception error) {
                handler.post(() -> showMessage(error.getMessage()));
            } finally {
                handler.post(() -> setBusy(loginButton, false));
            }
        });
    }

    private void refreshState() {
        executor.execute(() -> {
            try {
                JSONObject response = new ApiClient(baseUrl, token)
                        .get("/api/android/actividad");
                handler.post(() -> applyState(response));
            } catch (Exception error) {
                handler.post(() -> {
                    connectionLabel.setText("● Sin conexión");
                    showMessage(error.getMessage());
                });
            }
        });
    }

    private void toggleActivity() {
        if (!hasActivity && activities.isEmpty()) {
            showMessage("No hay actividades sincronizadas. Abrí la web antes de comenzar.");
            return;
        }
        setBusy(toggleButton, true);
        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                if (!hasActivity) {
                    ActivityOption selected = activities.get(
                            Math.max(0, activitySpinner.getSelectedItemPosition()));
                    body.put("actividad_codigo", selected.code);
                    body.put("actividad", selected.name);
                }
                JSONObject response = new ApiClient(baseUrl, token)
                        .post("/api/android/actividad/toggle", body);
                handler.post(() -> {
                    applyState(response);
                    showMessage(active ? "Actividad en operación." : "Actividad pausada.");
                });
            } catch (Exception error) {
                handler.post(() -> showMessage(error.getMessage()));
            } finally {
                handler.post(() -> setBusy(toggleButton, false));
            }
        });
    }

    private void finishActivity() {
        setBusy(finishButton, true);
        executor.execute(() -> {
            try {
                new ApiClient(baseUrl, token)
                        .post("/api/android/actividad/finalizar", new JSONObject());
                stopService(new Intent(this, MonitorService.class));
                handler.post(() -> {
                    applyEmptyState();
                    showMessage("Actividad finalizada correctamente.");
                });
            } catch (Exception error) {
                handler.post(() -> showMessage(error.getMessage()));
            } finally {
                handler.post(() -> setBusy(finishButton, false));
            }
        });
    }

    private void logout() {
        executor.execute(() -> {
            try {
                new ApiClient(baseUrl, token).post("/api/android/logout", new JSONObject());
            } catch (Exception ignored) {
                // La sesión local se cierra aunque el servidor no responda.
            }
            stopService(new Intent(this, MonitorService.class));
            token = "";
            preferences.edit().remove("token").remove("funcionario").apply();
            handler.post(() -> {
                activityPanel.setVisibility(View.GONE);
                loginPanel.setVisibility(View.VISIBLE);
                connectionLabel.setText("● Sin conexión");
                showMessage("");
            });
        });
    }

    private void showActivityPanel() {
        loginPanel.setVisibility(View.GONE);
        activityPanel.setVisibility(View.VISIBLE);
        userLabel.setText(funcionario + " · " + collector);
        connectionLabel.setText("● En línea");
    }

    private void applyState(JSONObject state) {
        hasActivity = state.optBoolean("tiene_registro", false);
        active = state.optBoolean("activa", false);
        elapsedSeconds = state.optLong("tiempo_segundos", 0);
        pauses = state.optInt("pausas", 0);
        stateReceivedAt = System.currentTimeMillis();
        connectionLabel.setText("● En línea");
        finishButton.setEnabled(hasActivity);
        activitySpinner.setEnabled(!hasActivity);
        pauseLabel.setText(pauses + (pauses == 1 ? " pausa" : " pausas"));
        if (!hasActivity) {
            applyEmptyState();
        } else if (active) {
            selectActivity(state.optString("actividad_codigo", ""));
            stateLabel.setText("En operación");
            toggleButton.setText("Ⅱ  Pausar actividad");
        } else {
            selectActivity(state.optString("actividad_codigo", ""));
            stateLabel.setText("Actividad pausada");
            toggleButton.setText("▶  Reanudar actividad");
        }
    }

    private void applyEmptyState() {
        hasActivity = false;
        active = false;
        elapsedSeconds = 0;
        pauses = 0;
        stateReceivedAt = System.currentTimeMillis();
        stateLabel.setText("Sin actividad");
        timeLabel.setText("00:00:00");
        pauseLabel.setText("0 pausas");
        toggleButton.setText("▶  Iniciar actividad");
        finishButton.setEnabled(false);
        activitySpinner.setEnabled(true);
    }

    private void loadActivities(String json) {
        activities.clear();
        try {
            JSONArray values = new JSONArray(json == null ? "[]" : json);
            for (int index = 0; index < values.length(); index++) {
                JSONObject value = values.optJSONObject(index);
                if (value == null) continue;
                String code = value.optString("codigo", "").trim();
                String name = value.optString("nombre", "").trim();
                if (!code.isEmpty() && !name.isEmpty()) {
                    activities.add(new ActivityOption(code, name));
                }
            }
        } catch (Exception ignored) {
            // El selector queda vacío y pide volver a sincronizar con la web.
        }
        List<String> labels = new ArrayList<>();
        for (ActivityOption option : activities) labels.add(option.toString());
        ArrayAdapter<String> adapter = new ArrayAdapter<>(
                this, android.R.layout.simple_spinner_item, labels);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        activitySpinner.setAdapter(adapter);
    }

    private void selectActivity(String code) {
        for (int index = 0; index < activities.size(); index++) {
            if (activities.get(index).code.equalsIgnoreCase(code)) {
                activitySpinner.setSelection(index);
                return;
            }
        }
    }

    private static final class ActivityOption {
        final String code;
        final String name;

        ActivityOption(String code, String name) {
            this.code = code;
            this.name = name;
        }

        @Override
        public String toString() {
            return code + " · " + name;
        }
    }

    private void startMonitor() {
        Intent service = new Intent(this, MonitorService.class);
        service.putExtra("server", baseUrl);
        service.putExtra("token", token);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(service);
        } else {
            startService(service);
        }
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 100);
        }
    }

    private void setBusy(Button button, boolean busy) {
        button.setEnabled(!busy);
        button.setAlpha(busy ? 0.55f : 1f);
    }

    private void showMessage(String message) {
        messageLabel.setText(message == null ? "" : message);
    }

    private static String normalizeServer(String value) {
        String normalized = value == null ? "" : value.trim();
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "http://" + normalized;
        }
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private static String formatTime(long seconds) {
        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        long remainder = seconds % 60;
        return String.format(Locale.ROOT, "%02d:%02d:%02d", hours, minutes, remainder);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(clock);
        executor.shutdownNow();
        super.onDestroy();
    }
}
