package com.ottersprod.lullio.widget

import android.content.Context
import org.json.JSONObject

data class TaskItem(
    val id: String,
    val title: String,
    val completed: Boolean
)

data class WidgetData(
    val isPremium: Boolean,
    val streak: Int,
    val suggestedTask: String?,
    val level: Int,
    val points: Int,
    val pointsToNextLevel: Int,
    val moodLevel: Int,
    val todayTaskCount: Int,
    val todayCompletedCount: Int,
    val tasks: List<TaskItem>
) {
    companion object {
        const val PREFS_NAME = "widget_data"
        const val STORAGE_KEY = "@widget_data"
        const val PENDING_MOOD_KEY = "@pending_mood"
        const val PENDING_TASK_COMPLETIONS_KEY = "@pending_task_completions"

        fun fromJson(json: String): WidgetData {
            val obj = JSONObject(json)
            val tasksArray = obj.optJSONArray("tasks")
            val taskList = mutableListOf<TaskItem>()
            if (tasksArray != null) {
                for (i in 0 until tasksArray.length()) {
                    val t = tasksArray.getJSONObject(i)
                    taskList.add(TaskItem(
                        id = t.getString("id"),
                        title = t.getString("title"),
                        completed = t.optBoolean("completed", false)
                    ))
                }
            }
            return WidgetData(
                isPremium = obj.optBoolean("isPremium", false),
                streak = obj.optInt("streak", 0),
                suggestedTask = if (obj.isNull("suggestedTask")) null else obj.optString("suggestedTask"),
                level = obj.optInt("level", 1),
                points = obj.optInt("points", 0),
                pointsToNextLevel = obj.optInt("pointsToNextLevel", 100),
                moodLevel = obj.optInt("moodLevel", 50),
                todayTaskCount = obj.optInt("todayTaskCount", 0),
                todayCompletedCount = obj.optInt("todayCompletedCount", 0),
                tasks = taskList
            )
        }

        fun load(context: Context): WidgetData {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val json = prefs.getString(STORAGE_KEY, null) ?: return default()
            return try {
                fromJson(json)
            } catch (_: Exception) {
                default()
            }
        }

        fun default() = WidgetData(
            isPremium = false,
            streak = 0,
            suggestedTask = null,
            level = 1,
            points = 0,
            pointsToNextLevel = 100,
            moodLevel = 50,
            todayTaskCount = 0,
            todayCompletedCount = 0,
            tasks = emptyList()
        )
    }

    val moodLabel: String get() = when {
        moodLevel <= 20 -> "Exhausted"
        moodLevel <= 40 -> "Low Energy"
        moodLevel <= 60 -> "Focused"
        moodLevel <= 80 -> "Motivated"
        else -> "Super Motivated"
    }
}
