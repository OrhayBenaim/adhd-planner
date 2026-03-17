package expo.modules.widgetbridge

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WidgetBridgeModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("WidgetBridge")

        Function("setItem") { key: String, value: String ->
            appContext.reactContext?.let { context ->
                val prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
                prefs.edit().putString(key, value).apply()
            }
        }

        Function("getItem") { key: String ->
            appContext.reactContext?.let { context ->
                val prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
                prefs.getString(key, null)
            }
        }

        Function("removeItem") { key: String ->
            appContext.reactContext?.let { context ->
                val prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
                prefs.edit().remove(key).apply()
            }
        }

        AsyncFunction("reloadWidgets") {
            appContext.reactContext?.let { context ->
                val appWidgetManager = AppWidgetManager.getInstance(context)

                val widgetProviders = listOf(
                    "com.ottersprod.lullio.widget.StreakWidgetProvider",
                    "com.ottersprod.lullio.widget.TodayTaskWidgetProvider",
                    "com.ottersprod.lullio.widget.MoodWidgetProvider"
                )

                for (providerName in widgetProviders) {
                    try {
                        val provider = ComponentName(context, providerName)
                        val widgetIds = appWidgetManager.getAppWidgetIds(provider)
                        if (widgetIds.isNotEmpty()) {
                            val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                            intent.component = provider
                            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
                            context.sendBroadcast(intent)
                        }
                    } catch (e: Exception) {
                        // Widget provider not found — skip
                    }
                }
            }
        }
    }
}
