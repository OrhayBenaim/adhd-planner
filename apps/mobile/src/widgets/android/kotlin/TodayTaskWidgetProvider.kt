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

class TodayTaskWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        private const val MAX_VISIBLE_TASKS = 5

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val data = WidgetData.load(context)
            val packageName = context.packageName

            val views = if (!data.isPremium) {
                RemoteViews(packageName, R.layout.widget_premium_upsell)
            } else {
                RemoteViews(packageName, R.layout.widget_today_task).apply {
                    setTextViewText(R.id.task_progress, "${data.todayCompletedCount}/${data.todayTaskCount}")

                    // Remove all task rows from the container
                    removeAllViews(R.id.task_list)

                    val uncompletedTasks = data.tasks.filter { !it.completed }

                    if (uncompletedTasks.isNotEmpty()) {
                        // Show task list
                        setViewVisibility(R.id.task_list, View.VISIBLE)
                        setViewVisibility(R.id.suggested_task, View.GONE)

                        for ((index, task) in uncompletedTasks.take(MAX_VISIBLE_TASKS).withIndex()) {
                            val row = RemoteViews(packageName, R.layout.widget_task_row).apply {
                                setTextViewText(R.id.task_title, task.title)

                                // Set up completion intent
                                val intent = Intent(context, TaskWidgetReceiver::class.java).apply {
                                    action = TaskWidgetReceiver.ACTION_COMPLETE_TASK
                                    putExtra(TaskWidgetReceiver.EXTRA_TASK_ID, task.id)
                                }
                                val pendingIntent = PendingIntent.getBroadcast(
                                    context,
                                    task.id.hashCode(),
                                    intent,
                                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                                )
                                setOnClickPendingIntent(R.id.task_checkbox, pendingIntent)
                            }
                            addView(R.id.task_list, row)
                        }
                    } else {
                        // No uncompleted task rows: show fallback message
                        setViewVisibility(R.id.task_list, View.GONE)
                        setViewVisibility(R.id.suggested_task, View.VISIBLE)
                        val taskText = when {
                            data.todayTaskCount > 0 && data.todayCompletedCount >= data.todayTaskCount ->
                                "All done — nice work!"
                            data.suggestedTask != null -> data.suggestedTask
                            else -> "No tasks for today"
                        }
                        setTextViewText(R.id.suggested_task, taskText)
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
