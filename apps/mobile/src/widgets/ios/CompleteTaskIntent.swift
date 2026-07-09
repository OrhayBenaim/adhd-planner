import AppIntents
import WidgetKit

@available(iOS 17.0, *)
struct CompleteTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Complete Task"
    static var description = IntentDescription("Mark a task as completed")

    @Parameter(title: "Task ID")
    var taskId: String

    init() {
        self.taskId = ""
    }

    init(taskId: String) {
        self.taskId = taskId
    }

    func perform() async throws -> some IntentResult {
        let defaults = UserDefaults(suiteName: WidgetData.appGroup)
        let pendingKey = WidgetData.pendingTaskCompletionsKey

        // Append to pending completions
        var ids: [String] = []
        if let existing = defaults?.string(forKey: pendingKey),
           let data = existing.data(using: .utf8),
           let parsed = try? JSONSerialization.jsonObject(with: data) as? [String] {
            ids = parsed
        }
        if !ids.contains(taskId) {
            ids.append(taskId)
        }
        if let jsonData = try? JSONSerialization.data(withJSONObject: ids),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            defaults?.set(jsonString, forKey: pendingKey)
        }

        // Mark task as completed in widget data
        if let jsonString = defaults?.string(forKey: WidgetData.storageKey),
           let data = jsonString.data(using: .utf8),
           var json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           var tasks = json["tasks"] as? [[String: Any]] {
            for i in 0..<tasks.count {
                if tasks[i]["id"] as? String == taskId {
                    tasks[i]["completed"] = true
                    break
                }
            }
            json["tasks"] = tasks
            let completedCount = (json["todayCompletedCount"] as? Int ?? 0) + 1
            json["todayCompletedCount"] = completedCount
            if let updatedData = try? JSONSerialization.data(withJSONObject: json),
               let updatedString = String(data: updatedData, encoding: .utf8) {
                defaults?.set(updatedString, forKey: WidgetData.storageKey)
            }
        }

        defaults?.synchronize()
        WidgetCenter.shared.reloadTimelines(ofKind: "TodayTaskWidget")

        return .result()
    }
}
