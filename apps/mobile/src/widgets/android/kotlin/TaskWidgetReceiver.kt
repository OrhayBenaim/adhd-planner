package com.ottersprod.lullio.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import org.json.JSONArray

class TaskWidgetReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_COMPLETE_TASK = "com.ottersprod.lullio.COMPLETE_TASK"
        const val EXTRA_TASK_ID = "task_id"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_COMPLETE_TASK) return

        val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: return

        val prefs = context.getSharedPreferences(WidgetData.PREFS_NAME, Context.MODE_PRIVATE)
        val existing = prefs.getString(WidgetData.PENDING_TASK_COMPLETIONS_KEY, null)
        val ids = try {
            if (existing != null) {
                val arr = JSONArray(existing)
                val list = mutableListOf<String>()
                for (i in 0 until arr.length()) {
                    list.add(arr.getString(i))
                }
                list
            } else {
                mutableListOf()
            }
        } catch (_: Exception) {
            mutableListOf()
        }

        if (!ids.contains(taskId)) {
            ids.add(taskId)
        }
        prefs.edit().putString(WidgetData.PENDING_TASK_COMPLETIONS_KEY, JSONArray(ids).toString()).apply()

        val json = prefs.getString(WidgetData.STORAGE_KEY, null)
        if (json != null) {
            try {
                val obj = org.json.JSONObject(json)
                val tasks = obj.optJSONArray("tasks")
                if (tasks != null) {
                    for (i in 0 until tasks.length()) {
                        val task = tasks.getJSONObject(i)
                        if (task.getString("id") == taskId) {
                            task.put("completed", true)
                            break
                        }
                    }
                    obj.put("tasks", tasks)
                    val completedCount = obj.optInt("todayCompletedCount", 0)
                    obj.put("todayCompletedCount", completedCount + 1)
                    prefs.edit().putString(WidgetData.STORAGE_KEY, obj.toString()).apply()
                }
            } catch (_: Exception) {}
        }

        val appWidgetManager = AppWidgetManager.getInstance(context)
        val provider = ComponentName(context, TodayTaskWidgetProvider::class.java)
        val widgetIds = appWidgetManager.getAppWidgetIds(provider)
        for (id in widgetIds) {
            TodayTaskWidgetProvider.updateWidget(context, appWidgetManager, id)
        }
    }
}
