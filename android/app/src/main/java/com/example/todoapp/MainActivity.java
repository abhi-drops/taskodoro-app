package com.example.todoapp;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(AlarmSoundPlugin.class);
        registerPlugin(PomodoroTimerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
