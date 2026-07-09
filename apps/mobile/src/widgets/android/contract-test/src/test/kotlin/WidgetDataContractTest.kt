package com.ottersprod.lullio.widget

import org.json.JSONObject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.io.File
import java.nio.file.Paths

class WidgetDataContractTest {
    private val fixturesDir: File = Paths.get(
        System.getProperty("user.dir"),
        "../../../../../packages/types/src/widget-fixtures",
    ).normalize().toFile()

    private val manifest: JSONObject by lazy {
        JSONObject(fixturesDir.resolve("expectations.json").readText())
    }

    @Test
    fun storageKeysMatchManifest() {
        val keys = manifest.getJSONObject("storageKeys")
        assertEquals(keys.getString("widgetData"), WidgetData.STORAGE_KEY)
        assertEquals(keys.getString("pendingMood"), WidgetData.PENDING_MOOD_KEY)
        assertEquals(keys.getString("pendingTaskCompletions"), WidgetData.PENDING_TASK_COMPLETIONS_KEY)
    }

    @Test
    fun parsesGoldenFixtures() {
        val parseOnly = manifest.getJSONArray("parseOnlyFixtures")
        val parseOnlySet = (0 until parseOnly.length()).map { parseOnly.getString(it) }.toSet()

        val fixtures = manifest.getJSONArray("fixtures")
        for (i in 0 until fixtures.length()) {
            val fileName = fixtures.getString(i)
            if (parseOnlySet.contains(fileName)) continue

            val raw = fixturesDir.resolve(fileName).readText()
            val expected = JSONObject(raw)
            val data = WidgetData.fromJson(raw)

            assertEquals(expected.getBoolean("isPremium"), data.isPremium)
            assertEquals(expected.getInt("streak"), data.streak)
            if (expected.isNull("suggestedTask")) {
                assertEquals(null, data.suggestedTask)
            } else {
                assertEquals(expected.getString("suggestedTask"), data.suggestedTask)
            }
            assertEquals(expected.getInt("level"), data.level)
            assertEquals(expected.getInt("points"), data.points)
            assertEquals(expected.getInt("pointsToNextLevel"), data.pointsToNextLevel)
            assertEquals(expected.getInt("moodLevel"), data.moodLevel)
            assertEquals(expected.getInt("todayTaskCount"), data.todayTaskCount)
            assertEquals(expected.getInt("todayCompletedCount"), data.todayCompletedCount)

            val moodLevel = data.moodLevel
            val boundaries = manifest.getJSONArray("moodBoundaries")
            val boundary = (0 until boundaries.length())
                .map { boundaries.getJSONObject(it) }
                .first { it.getInt("level") == moodLevel }
            assertEquals(boundary.getString("label"), data.moodLabel)

            if (expected.has("tasks") && !expected.isNull("tasks")) {
                val tasks = expected.getJSONArray("tasks")
                assertEquals(tasks.length(), data.tasks.size)
            } else {
                assertTrue(data.tasks.isEmpty())
            }
        }
    }

    @Test
    fun malformedJsonFallsBackToDefaults() {
        val malformed = fixturesDir.resolve("malformed.json").readText()
        assertThrows<Exception> { WidgetData.fromJson(malformed) }

        val empty = fixturesDir.resolve("empty.json").readText()
        assertThrows<Exception> { WidgetData.fromJson(empty) }

        val defaults = WidgetData.default()
        assertEquals(false, defaults.isPremium)
        assertEquals(0, defaults.streak)
        assertEquals(null, defaults.suggestedTask)
        assertEquals(1, defaults.level)
        assertEquals(50, defaults.moodLevel)
    }
}
