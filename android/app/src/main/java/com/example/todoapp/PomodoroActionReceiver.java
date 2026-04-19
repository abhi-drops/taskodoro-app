package com.example.todoapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

/**
 * Handles notification action button taps (PendingIntent broadcasts)
 * and forwards them to PomodoroTimerService.
 */
public class PomodoroActionReceiver extends BroadcastReceiver {

    public static final String ACTION_NOTIF_PAUSE    = "com.example.todoapp.action.NOTIF_PAUSE";
    public static final String ACTION_NOTIF_RESUME   = "com.example.todoapp.action.NOTIF_RESUME";
    public static final String ACTION_NOTIF_ADD_FIVE = "com.example.todoapp.action.NOTIF_ADD_FIVE";
    public static final String ACTION_NOTIF_NEXT     = "com.example.todoapp.action.NOTIF_NEXT";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        String serviceAction;
        switch (action) {
            case ACTION_NOTIF_PAUSE:    serviceAction = PomodoroTimerService.ACTION_PAUSE;      break;
            case ACTION_NOTIF_RESUME:   serviceAction = PomodoroTimerService.ACTION_RESUME;     break;
            case ACTION_NOTIF_ADD_FIVE: serviceAction = PomodoroTimerService.ACTION_ADD_FIVE;   break;
            case ACTION_NOTIF_NEXT:     serviceAction = PomodoroTimerService.ACTION_NEXT_BLOCK; break;
            default: return;
        }

        Intent serviceIntent = new Intent(context, PomodoroTimerService.class);
        serviceIntent.setAction(serviceAction);
        ContextCompat.startForegroundService(context, serviceIntent);
    }
}
