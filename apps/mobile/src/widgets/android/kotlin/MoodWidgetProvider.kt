package com.ottersprod.lullio.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.ottersprod.lullio.R

class MoodWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        // Each mood zone: (tap target id, mood level sent to receiver, thumb id shown when selected)
        private val MOOD_ZONES = listOf(
            Triple(R.id.mood_tap_1, 10, R.id.mood_thumb_1),
            Triple(R.id.mood_tap_2, 30, R.id.mood_thumb_2),
            Triple(R.id.mood_tap_3, 50, R.id.mood_thumb_3),
            Triple(R.id.mood_tap_4, 70, R.id.mood_thumb_4),
            Triple(R.id.mood_tap_5, 90, R.id.mood_thumb_5),
        )

        // Nearest of the 5 snap levels for the current mood value (0-100).
        private fun snapIndex(moodLevel: Int): Int = when {
            moodLevel <= 20 -> 0
            moodLevel <= 40 -> 1
            moodLevel <= 60 -> 2
            moodLevel <= 80 -> 3
            else -> 4
        }

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val data = WidgetData.load(context)
            val packageName = context.packageName

            val views = if (!data.isPremium) {
                RemoteViews(packageName, R.layout.widget_premium_upsell)
            } else {
                RemoteViews(packageName, R.layout.widget_mood).apply {
                    setTextViewText(R.id.mood_label, data.moodLabel)

                    val selected = snapIndex(data.moodLevel)

                    MOOD_ZONES.forEachIndexed { index, (tapId, level, thumbId) ->
                        // Show only the selected thumb; RemoteViews reapplies the whole
                        // layout, so every thumb's visibility must be set explicitly.
                        setViewVisibility(thumbId, if (index == selected) View.VISIBLE else View.GONE)

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
                        setOnClickPendingIntent(tapId, pendingIntent)
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
