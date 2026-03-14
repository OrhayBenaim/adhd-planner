package com.ottersprod.lullio.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
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

            val views = if (!data.isPremium) {
                RemoteViews(packageName, R.layout.widget_premium_upsell)
            } else {
                RemoteViews(packageName, R.layout.widget_streak).apply {
                    setTextViewText(R.id.streak_count, "${data.streak}")
                    setTextViewText(R.id.level_text, "Level ${data.level}")
                    val progress = if (data.pointsToNextLevel > 0) {
                        (data.points * 100) / data.pointsToNextLevel
                    } else 0
                    setProgressBar(R.id.xp_progress, 100, progress, false)
                }
            }

            // Click on root: non-premium opens paywall deep link, premium opens app
            val rootIntent = if (!data.isPremium) {
                Intent(Intent.ACTION_VIEW, Uri.parse("lullio://paywall")).apply {
                    setPackage(packageName)
                }
            } else {
                context.packageManager.getLaunchIntentForPackage(packageName)
            }
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
