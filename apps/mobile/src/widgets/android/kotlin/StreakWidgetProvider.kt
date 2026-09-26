package com.ottersprod.lullio.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.util.TypedValue
import android.widget.RemoteViews
import com.ottersprod.lullio.R

class StreakWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val data = WidgetData.load(context)
            val packageName = context.packageName

            val views = RemoteViews(packageName, R.layout.widget_streak).apply {
                if (data.streak > 0) {
                    setImageViewResource(R.id.streak_mascot, R.drawable.widget_mascot_celebrate)
                    setTextViewText(R.id.streak_count, "${data.streak}")
                    setTextViewTextSize(R.id.streak_count, TypedValue.COMPLEX_UNIT_SP, 30f)
                    setTextViewText(R.id.streak_caption, "day streak")
                } else {
                    setImageViewResource(R.id.streak_mascot, R.drawable.widget_mascot_wave)
                    setTextViewText(R.id.streak_count, "Start today!")
                    setTextViewTextSize(R.id.streak_count, TypedValue.COMPLEX_UNIT_SP, 16f)
                    setTextViewText(R.id.streak_caption, "build your streak")
                }
                setTextViewText(R.id.level_text, "Level ${data.level}")
                val progress = if (data.pointsToNextLevel > 0) {
                    (data.points * 100) / data.pointsToNextLevel
                } else 0
                setProgressBar(R.id.xp_progress, 100, progress, false)
            }

            val rootIntent = context.packageManager.getLaunchIntentForPackage(packageName)
            if (rootIntent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, appWidgetId, rootIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
