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
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_SET_MOOD) return

        val moodLevel = intent.getIntExtra(EXTRA_MOOD_LEVEL, -1)
        if (moodLevel < 0) return

        val prefs = context.getSharedPreferences(WidgetData.PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(WidgetData.PENDING_MOOD_KEY, moodLevel.toString()).apply()

        val json = prefs.getString(WidgetData.STORAGE_KEY, null)
        if (json != null) {
            try {
                val obj = org.json.JSONObject(json)
                obj.put("moodLevel", moodLevel)
                prefs.edit().putString(WidgetData.STORAGE_KEY, obj.toString()).apply()
            } catch (_: Exception) {}
        }

        val appWidgetManager = AppWidgetManager.getInstance(context)
        val provider = ComponentName(context, MoodWidgetProvider::class.java)
        val widgetIds = appWidgetManager.getAppWidgetIds(provider)
        for (id in widgetIds) {
            MoodWidgetProvider.updateWidget(context, appWidgetManager, id)
        }
    }
}
