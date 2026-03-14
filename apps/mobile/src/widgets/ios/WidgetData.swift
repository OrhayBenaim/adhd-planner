import Foundation

struct WidgetTaskItem: Codable {
    let id: String
    let title: String
    let completed: Bool
}

struct WidgetData: Codable {
    let isPremium: Bool
    let streak: Int
    let suggestedTask: String?
    let level: Int
    let points: Int
    let pointsToNextLevel: Int
    let moodLevel: Int
    let todayTaskCount: Int
    let todayCompletedCount: Int
    let tasks: [WidgetTaskItem]?

    static let appGroup = "group.com.ottersprod.lullio.widgets"
    static let storageKey = "@widget_data"

    static func load() -> WidgetData? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let jsonString = defaults.string(forKey: storageKey),
              let data = jsonString.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }

    static var placeholder: WidgetData {
        WidgetData(
            isPremium: false,
            streak: 0,
            suggestedTask: nil,
            level: 1,
            points: 0,
            pointsToNextLevel: 100,
            moodLevel: 50,
            todayTaskCount: 0,
            todayCompletedCount: 0,
            tasks: nil
        )
    }

    var moodEmoji: String {
        if moodLevel >= 80 { return "😊" }
        if moodLevel >= 60 { return "🙂" }
        if moodLevel >= 40 { return "😐" }
        if moodLevel >= 20 { return "😔" }
        return "😢"
    }

    var moodLabel: String {
        if moodLevel >= 80 { return "Great" }
        if moodLevel >= 60 { return "Good" }
        if moodLevel >= 40 { return "Okay" }
        if moodLevel >= 20 { return "Low" }
        return "Rough"
    }
}
