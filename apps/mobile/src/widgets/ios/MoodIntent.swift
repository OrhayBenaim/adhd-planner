import AppIntents
import WidgetKit

@available(iOS 17.0, *)
struct SetMoodIntent: AppIntent {
    static var title: LocalizedStringResource = "Set Mood"
    static var description = IntentDescription("Set your current mood level")

    @Parameter(title: "Mood Level")
    var moodLevel: Int

    init() {
        self.moodLevel = 50
    }

    init(moodLevel: Int) {
        self.moodLevel = moodLevel
    }

    func perform() async throws -> some IntentResult {
        let defaults = UserDefaults(suiteName: WidgetData.appGroup)

        // Store pending mood for the app to pick up
        defaults?.set(String(moodLevel), forKey: WidgetData.pendingMoodKey)

        // Update widget data so the widget refreshes immediately
        if let jsonString = defaults?.string(forKey: WidgetData.storageKey),
           let data = jsonString.data(using: .utf8),
           var json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            json["moodLevel"] = moodLevel
            if let updatedData = try? JSONSerialization.data(withJSONObject: json),
               let updatedString = String(data: updatedData, encoding: .utf8) {
                defaults?.set(updatedString, forKey: WidgetData.storageKey)
            }
        }

        defaults?.synchronize()
        WidgetCenter.shared.reloadTimelines(ofKind: "MoodWidget")

        return .result()
    }
}
