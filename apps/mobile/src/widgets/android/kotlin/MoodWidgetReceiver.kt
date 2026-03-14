package com.ottersprod.lullio.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent

class MoodWidgetReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_SET_MOOD = "com.ottersprod.lullio.SET_MOOD"
        const val EXTRA_MOOD_LEVEL = "mood_level"
        private const val PREFS_NAME = "widget_data"
        private const val PENDING_MOOD_KEY = "@pending_mood"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_SET_MOOD) return

        val moodLevel = intent.getIntExtra(EXTRA_MOOD_LEVEL, -1)
        if (moodLevel < 0) return

        // Store pending mood for the app to pick up
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(PENDING_MOOD_KEY, moodLevel.toString()).apply()

        // Also update the widget data so the widget refreshes immediately
        val json = prefs.getString("@widget_data", null)
        if (json != null) {
            try {
                val obj = org.json.JSONObject(json)
                obj.put("moodLevel", moodLevel)
                prefs.edit().putString("@widget_data", obj.toString()).apply()
            } catch (_: Exception) {}
        }

        // Refresh mood widgets
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val provider = ComponentName(context, MoodWidgetProvider::class.java)
        val widgetIds = appWidgetManager.getAppWidgetIds(provider)
        for (id in widgetIds) {
            MoodWidgetProvider.updateWidget(context, appWidgetManager, id)
        }
    }
}
