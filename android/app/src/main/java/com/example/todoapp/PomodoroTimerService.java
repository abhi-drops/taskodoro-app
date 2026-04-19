package com.example.todoapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class PomodoroTimerService extends Service {

    // ── Intent action constants ──────────────────────────────────────────────
    public static final String ACTION_START        = "com.example.todoapp.POMODORO_START";
    public static final String ACTION_PAUSE        = "com.example.todoapp.POMODORO_PAUSE";
    public static final String ACTION_RESUME       = "com.example.todoapp.POMODORO_RESUME";
    public static final String ACTION_ADD_FIVE     = "com.example.todoapp.POMODORO_ADD_FIVE";
    public static final String ACTION_NEXT_BLOCK   = "com.example.todoapp.POMODORO_NEXT_BLOCK";
    public static final String ACTION_STOP         = "com.example.todoapp.POMODORO_STOP";
    public static final String ACTION_SYNC_REQUEST = "com.example.todoapp.POMODORO_SYNC_REQUEST";

    // ── LocalBroadcast event actions sent TO the plugin ──────────────────────
    public static final String BROADCAST_STATE = "com.example.todoapp.POMODORO_STATE";
    public static final String BROADCAST_EVENT = "com.example.todoapp.POMODORO_EVENT";

    // ── Notification constants ───────────────────────────────────────────────
    static final int    NOTIFICATION_ID = 1001;
    static final String CHANNEL_ID      = "pomodoro_timer";

    // ── Inner data class ─────────────────────────────────────────────────────
    static class PomodoroBlockData {
        String  id;
        String  type;        // "work" | "break"
        String  label;
        int     durationMins;
        String  taskId;
        String  groupId;
        boolean completed;
    }

    // ── Static snapshot (read by plugin's getState without round-trip) ───────
    static volatile ServiceState lastKnownState = null;

    static class ServiceState {
        int     blockIdx;
        int     timeLeftSeconds;
        boolean isRunning;
        String  blockType;
        String  blockLabel;
        int     totalSeconds;
        boolean isExpired;
    }

    // ── Instance state ───────────────────────────────────────────────────────
    private List<PomodoroBlockData> blocks = new ArrayList<>();
    private int     blockIdx        = 0;
    private int     timeLeftSeconds = 0;
    private boolean isRunning       = false;
    private int     blockTotalSeconds = 0;
    private boolean isExpired       = false;

    private Handler          tickHandler;
    private Runnable         tickRunnable;
    private NotificationManager notifManager;

    // ────────────────────────────────────────────────────────────────────────
    @Override
    public void onCreate() {
        super.onCreate();
        tickHandler  = new Handler(Looper.getMainLooper());
        notifManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || intent.getAction() == null) return START_STICKY;

        switch (intent.getAction()) {
            case ACTION_START:        handleStart(intent);    break;
            case ACTION_PAUSE:        handlePause();          break;
            case ACTION_RESUME:       handleResume();         break;
            case ACTION_ADD_FIVE:     handleAddFive();        break;
            case ACTION_NEXT_BLOCK:   handleNextBlock();      break;
            case ACTION_STOP:         handleStop();           break;
            case ACTION_SYNC_REQUEST: broadcastState();       break;
        }
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        stopTick();
        super.onDestroy();
    }

    // ── Action handlers ──────────────────────────────────────────────────────

    private void handleStart(Intent intent) {
        // Deserialize block list from JSON string extra
        String blocksJson = intent.getStringExtra("blocksJson");
        blockIdx          = intent.getIntExtra("blockIdx", 0);
        timeLeftSeconds   = intent.getIntExtra("timeLeftSeconds", 0);
        isExpired         = false;
        isRunning         = true;

        blocks = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(blocksJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                PomodoroBlockData b = new PomodoroBlockData();
                b.id          = obj.getString("id");
                b.type        = obj.getString("type");
                b.label       = obj.getString("label");
                b.durationMins= obj.getInt("durationMins");
                b.taskId      = obj.optString("taskId", null);
                b.groupId     = obj.optString("groupId", null);
                b.completed   = obj.optBoolean("completed", false);
                blocks.add(b);
            }
        } catch (Exception e) {
            // If parsing fails, stop gracefully
            stopSelf();
            return;
        }

        if (blocks.isEmpty() || blockIdx >= blocks.size()) {
            stopSelf();
            return;
        }

        blockTotalSeconds = blocks.get(blockIdx).durationMins * 60;

        // Build initial notification and move to foreground
        Notification notification = buildNotification();
        startForeground(NOTIFICATION_ID, notification);

        startTick();
        updateSnapshot();
    }

    private void handlePause() {
        if (!isRunning) return;
        isRunning = false;
        stopTick();
        updateSnapshot();
        updateNotification();
        broadcastPauseEvent(false);
    }

    private void handleResume() {
        if (isRunning || isExpired) return;
        isRunning = true;
        startTick();
        updateSnapshot();
        updateNotification();
        broadcastPauseEvent(true);
    }

    private void handleAddFive() {
        timeLeftSeconds += 300;
        blockTotalSeconds += 300;
        if (isExpired) {
            isExpired = false;
            isRunning = true;
            startTick();
        }
        updateSnapshot();
        updateNotification();
        broadcastSimpleEvent("addedFive");
    }

    private void handleNextBlock() {
        stopTick();
        blockIdx++;

        if (blockIdx >= blocks.size()) {
            // Session complete
            updateSnapshot();
            broadcastSimpleEvent("sessionEnded");
            stopForeground(true);
            stopSelf();
            return;
        }

        PomodoroBlockData next = blocks.get(blockIdx);
        timeLeftSeconds   = next.durationMins * 60;
        blockTotalSeconds = timeLeftSeconds;
        isRunning         = true;
        isExpired         = false;

        updateSnapshot();
        updateNotification();
        broadcastBlockAdvancedEvent(blockIdx);
        startTick();
    }

    private void handleStop() {
        stopTick();
        stopForeground(true);
        stopSelf();
    }

    // ── Tick logic ───────────────────────────────────────────────────────────

    private void startTick() {
        stopTick(); // clear any existing
        tickRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isRunning) return;

                timeLeftSeconds--;

                if (timeLeftSeconds <= 0) {
                    timeLeftSeconds = 0;
                    isRunning = false;
                    isExpired = true;
                    updateSnapshot();
                    updateNotification();
                    broadcastSimpleEvent("blockExpired");
                    return; // don't re-post
                }

                updateSnapshot();
                updateNotification();
                broadcastState();
                tickHandler.postDelayed(this, 1000);
            }
        };
        tickHandler.postDelayed(tickRunnable, 1000);
    }

    private void stopTick() {
        if (tickRunnable != null) {
            tickHandler.removeCallbacks(tickRunnable);
            tickRunnable = null;
        }
    }

    // ── Notification ─────────────────────────────────────────────────────────

    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Pomodoro Timer",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Shows the active Pomodoro timer");
        channel.setShowBadge(false);
        channel.enableVibration(false);
        channel.setSound(null, null);
        notifManager.createNotificationChannel(channel);
    }

    private Notification buildNotification() {
        if (blocks.isEmpty() || blockIdx >= blocks.size()) {
            return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_timer_work)
                .setContentTitle("Pomodoro")
                .setOngoing(true)
                .build();
        }

        PomodoroBlockData block = blocks.get(blockIdx);
        boolean isWork = "work".equals(block.type);
        int elapsed = blockTotalSeconds - timeLeftSeconds;
        int progress = Math.max(0, elapsed);

        String timeText = isExpired ? "Time's Up!" : formatTime(timeLeftSeconds);
        String title = isExpired
            ? (isWork ? "Done: " + block.label : "Break over!")
            : block.label;

        // Content intent — tap notification to reopen app
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(isWork ? R.drawable.ic_timer_work : R.drawable.ic_timer_break)
            .setContentTitle(title)
            .setContentText(timeText)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setOngoing(!isExpired)
            .setShowWhen(false)
            .setContentIntent(openPi)
            .setProgress(blockTotalSeconds, progress, false);

        // Action buttons
        if (!isExpired) {
            if (isRunning) {
                builder.addAction(R.drawable.ic_pause, "Pause", makeBroadcastPi(PomodoroActionReceiver.ACTION_NOTIF_PAUSE, 101));
            } else {
                builder.addAction(R.drawable.ic_play, "Resume", makeBroadcastPi(PomodoroActionReceiver.ACTION_NOTIF_RESUME, 102));
            }
            builder.addAction(R.drawable.ic_add_time, "+5 min", makeBroadcastPi(PomodoroActionReceiver.ACTION_NOTIF_ADD_FIVE, 103));
            builder.addAction(R.drawable.ic_skip_next, "Next", makeBroadcastPi(PomodoroActionReceiver.ACTION_NOTIF_NEXT, 104));
        } else {
            builder.addAction(R.drawable.ic_add_time, "+5 min", makeBroadcastPi(PomodoroActionReceiver.ACTION_NOTIF_ADD_FIVE, 103));
            builder.addAction(R.drawable.ic_skip_next, "Next", makeBroadcastPi(PomodoroActionReceiver.ACTION_NOTIF_NEXT, 104));
        }

        return builder.build();
    }

    private void updateNotification() {
        notifManager.notify(NOTIFICATION_ID, buildNotification());
    }

    private PendingIntent makeBroadcastPi(String action, int requestCode) {
        Intent i = new Intent(this, PomodoroActionReceiver.class);
        i.setAction(action);
        return PendingIntent.getBroadcast(
            this, requestCode, i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    // ── Broadcast helpers ────────────────────────────────────────────────────

    private void broadcastState() {
        if (blocks.isEmpty() || blockIdx >= blocks.size()) return;
        PomodoroBlockData block = blocks.get(blockIdx);

        Intent intent = new Intent(BROADCAST_STATE);
        intent.putExtra("blockIdx",        blockIdx);
        intent.putExtra("timeLeftSeconds", timeLeftSeconds);
        intent.putExtra("isRunning",       isRunning);
        intent.putExtra("blockType",       block.type);
        intent.putExtra("blockLabel",      block.label);
        intent.putExtra("totalSeconds",    blockTotalSeconds);
        intent.putExtra("isExpired",       isExpired);
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }

    private void broadcastSimpleEvent(String eventType) {
        Intent intent = new Intent(BROADCAST_EVENT);
        intent.putExtra("eventType", eventType);
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }

    private void broadcastPauseEvent(boolean running) {
        Intent intent = new Intent(BROADCAST_EVENT);
        intent.putExtra("eventType", "pauseChanged");
        intent.putExtra("isRunning", running);
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }

    private void broadcastBlockAdvancedEvent(int newIdx) {
        Intent intent = new Intent(BROADCAST_EVENT);
        intent.putExtra("eventType", "blockAdvanced");
        intent.putExtra("blockIdx",  newIdx);
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }

    // ── Snapshot ─────────────────────────────────────────────────────────────

    private void updateSnapshot() {
        ServiceState s = new ServiceState();
        s.blockIdx        = blockIdx;
        s.timeLeftSeconds = timeLeftSeconds;
        s.isRunning       = isRunning;
        s.isExpired       = isExpired;
        s.totalSeconds    = blockTotalSeconds;
        if (!blocks.isEmpty() && blockIdx < blocks.size()) {
            PomodoroBlockData b = blocks.get(blockIdx);
            s.blockType  = b.type;
            s.blockLabel = b.label;
        } else {
            s.blockType  = "work";
            s.blockLabel = "";
        }
        lastKnownState = s;
    }

    // ── Utility ──────────────────────────────────────────────────────────────

    private static String formatTime(int totalSeconds) {
        int m = totalSeconds / 60;
        int s = totalSeconds % 60;
        return String.format(Locale.US, "%02d:%02d", m, s);
    }
}
