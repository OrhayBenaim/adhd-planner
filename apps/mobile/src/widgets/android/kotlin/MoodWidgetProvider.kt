package com.ottersprod.lullio.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.ottersprod.lullio.R

class MoodWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        private val MOOD_BUTTONS = listOf(
            Triple(R.id.mood_btn_1, 10, "😢"),
            Triple(R.id.mood_btn_2, 30, "😔"),
            Triple(R.id.mood_btn_3, 50, "😐"),
            Triple(R.id.mood_btn_4, 70, "🙂"),
            Triple(R.id.mood_btn_5, 90, "😊"),
        )

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val data = WidgetData.load(context)
            val packageName = context.packageName

            val views = if (!data.isPremium) {
                RemoteViews(packageName, R.layout.widget_premium_upsell)
            } else {
                RemoteViews(packageName, R.layout.widget_mood).apply {
                    setTextViewText(R.id.mood_emoji, data.moodEmoji)
                    setTextViewText(R.id.mood_label, data.moodLabel)

                    // Set up mood button PendingIntents
                    for ((viewId, level, _) in MOOD_BUTTONS) {
                        val intent = Intent(context, MoodWidgetReceiver::class.java).apply {
                            action = MoodWidgetReceiver.ACTION_SET_MOOD
                            putExtra(MoodWidgetReceiver.EXTRA_MOOD_LEVEL, level)
                        }
                        val pendingIntent = PendingIntent.getBroadcast(
                            context,
                            level, // unique request code per mood level
                            intent,
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )
                        setOnClickPendingIntent(viewId, pendingIntent)
                    }
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
