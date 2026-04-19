package com.example.todoapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PomodoroTimer")
public class PomodoroTimerPlugin extends Plugin {

    private static final int REQUEST_CODE_NOTIFY = 2001;

    private BroadcastReceiver serviceEventReceiver;

    // ── Lifecycle ────────────────────────────────────────────────────────────

    @Override
    public void handleOnStart() {
        registerServiceReceiver();
    }

    @Override
    public void handleOnStop() {
        unregisterServiceReceiver();
    }

    @Override
    public void handleOnResume() {
        // App came to foreground — ask service for a fresh state broadcast
        sendServiceIntent(PomodoroTimerService.ACTION_SYNC_REQUEST);
    }

    // ── Plugin methods ───────────────────────────────────────────────────────

    @PluginMethod
    public void start(PluginCall call) {
        JSArray blocksArray = call.getArray("blocks");
        int blockIdx        = call.getInt("blockIdx", 0);
        int timeLeftSeconds = call.getInt("timeLeftSeconds", 0);

        if (blocksArray == null) {
            call.reject("blocks is required");
            return;
        }

        Intent intent = new Intent(getContext(), PomodoroTimerService.class);
        intent.setAction(PomodoroTimerService.ACTION_START);
        intent.putExtra("blocksJson",       blocksArray.toString());
        intent.putExtra("blockIdx",         blockIdx);
        intent.putExtra("timeLeftSeconds",  timeLeftSeconds);
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        sendServiceIntent(PomodoroTimerService.ACTION_PAUSE);
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        sendServiceIntent(PomodoroTimerService.ACTION_RESUME);
        call.resolve();
    }

    @PluginMethod
    public void addFive(PluginCall call) {
        sendServiceIntent(PomodoroTimerService.ACTION_ADD_FIVE);
        call.resolve();
    }

    @PluginMethod
    public void nextBlock(PluginCall call) {
        sendServiceIntent(PomodoroTimerService.ACTION_NEXT_BLOCK);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        sendServiceIntent(PomodoroTimerService.ACTION_STOP);
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        PomodoroTimerService.ServiceState s = PomodoroTimerService.lastKnownState;
        if (s == null) {
            call.reject("No active timer state");
            return;
        }
        JSObject result = new JSObject();
        result.put("blockIdx",        s.blockIdx);
        result.put("timeLeftSeconds", s.timeLeftSeconds);
        result.put("isRunning",       s.isRunning);
        result.put("blockType",       s.blockType != null ? s.blockType : "work");
        result.put("blockLabel",      s.blockLabel != null ? s.blockLabel : "");
        result.put("totalSeconds",    s.totalSeconds);
        result.put("isExpired",       s.isExpired);
        call.resolve(result);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33) {
            ActivityCompat.requestPermissions(
                getActivity(),
                new String[]{ android.Manifest.permission.POST_NOTIFICATIONS },
                REQUEST_CODE_NOTIFY
            );
        }
        call.resolve();
    }

    // ── Service receiver ─────────────────────────────────────────────────────

    private void registerServiceReceiver() {
        if (serviceEventReceiver != null) return;

        serviceEventReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (action == null) return;

                if (PomodoroTimerService.BROADCAST_STATE.equals(action)) {
                    JSObject state = new JSObject();
                    state.put("blockIdx",        intent.getIntExtra("blockIdx", 0));
                    state.put("timeLeftSeconds", intent.getIntExtra("timeLeftSeconds", 0));
                    state.put("isRunning",       intent.getBooleanExtra("isRunning", false));
                    state.put("blockType",       intent.getStringExtra("blockType"));
                    state.put("blockLabel",      intent.getStringExtra("blockLabel"));
                    state.put("totalSeconds",    intent.getIntExtra("totalSeconds", 0));
                    state.put("isExpired",       intent.getBooleanExtra("isExpired", false));
                    notifyListeners("timerTick", state, true);

                } else if (PomodoroTimerService.BROADCAST_EVENT.equals(action)) {
                    JSObject event = new JSObject();
                    String eventType = intent.getStringExtra("eventType");
                    event.put("eventType", eventType);
                    if (intent.hasExtra("blockIdx")) {
                        event.put("blockIdx", intent.getIntExtra("blockIdx", 0));
                    }
                    if (intent.hasExtra("isRunning")) {
                        event.put("isRunning", intent.getBooleanExtra("isRunning", false));
                    }
                    notifyListeners("timerEvent", event, true);
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(PomodoroTimerService.BROADCAST_STATE);
        filter.addAction(PomodoroTimerService.BROADCAST_EVENT);
        LocalBroadcastManager.getInstance(getContext())
            .registerReceiver(serviceEventReceiver, filter);
    }

    private void unregisterServiceReceiver() {
        if (serviceEventReceiver != null) {
            LocalBroadcastManager.getInstance(getContext())
                .unregisterReceiver(serviceEventReceiver);
            serviceEventReceiver = null;
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void sendServiceIntent(String action) {
        Intent intent = new Intent(getContext(), PomodoroTimerService.class);
        intent.setAction(action);
        ContextCompat.startForegroundService(getContext(), intent);
    }
}
