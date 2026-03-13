package com.ottersprod.lullio.widget

import android.content.Context
import org.json.JSONObject

data class WidgetData(
    val isPremium: Boolean,
    val streak: Int,
    val suggestedTask: String?,
    val level: Int,
    val points: Int,
    val pointsToNextLevel: Int,
    val moodLevel: Int,
    val todayTaskCount: Int,
    val todayCompletedCount: Int
) {
    companion object {
        private const val PREFS_NAME = "widget_data"
        private const val KEY = "@widget_data"

        fun load(context: Context): WidgetData {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val json = prefs.getString(KEY, null) ?: return default()
            return try {
                val obj = JSONObject(json)
                WidgetData(
                    isPremium = obj.optBoolean("isPremium", false),
                    streak = obj.optInt("streak", 0),
                    suggestedTask = if (obj.isNull("suggestedTask")) null else obj.optString("suggestedTask"),
                    level = obj.optInt("level", 1),
                    points = obj.optInt("points", 0),
                    pointsToNextLevel = obj.optInt("pointsToNextLevel", 100),
                    moodLevel = obj.optInt("moodLevel", 50),
                    todayTaskCount = obj.optInt("todayTaskCount", 0),
                    todayCompletedCount = obj.optInt("todayCompletedCount", 0)
                )
            } catch (e: Exception) {
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
            todayCompletedCount = 0
        )
    }

    val moodEmoji: String get() = when {
        moodLevel >= 80 -> "😊"
        moodLevel >= 60 -> "🙂"
        moodLevel >= 40 -> "😐"
        moodLevel >= 20 -> "😔"
        else -> "😢"
    }

    val moodLabel: String get() = when {
        moodLevel >= 80 -> "Great"
        moodLevel >= 60 -> "Good"
        moodLevel >= 40 -> "Okay"
        moodLevel >= 20 -> "Low"
        else -> "Rough"
    }
}
