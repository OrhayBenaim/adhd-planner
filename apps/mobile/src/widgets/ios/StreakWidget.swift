import WidgetKit
import SwiftUI

struct StreakEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct StreakProvider: TimelineProvider {
    func placeholder(in context: Context) -> StreakEntry {
        StreakEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        completion(StreakEntry(date: Date(), data: WidgetData.load() ?? .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        let entry = StreakEntry(date: Date(), data: WidgetData.load() ?? .placeholder)
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct StreakWidgetView: View {
    let entry: StreakEntry

    var body: some View {
        if !entry.data.isPremium {
            PremiumUpsellView()
        } else {
            VStack(spacing: 6) {
                Text("🔥")
                    .font(.title2)
                Text("\(entry.data.streak)")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))
                Text("Day Streak")
                    .font(.caption)
                    .foregroundColor(.secondary)
                ProgressView(value: Double(entry.data.points),
                             total: Double(max(entry.data.pointsToNextLevel, 1)))
                    .tint(.blue)
                Text("Level \(entry.data.level)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding()
            .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

struct StreakWidget: Widget {
    let kind = "StreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StreakProvider()) { entry in
            StreakWidgetView(entry: entry)
        }
        .configurationDisplayName("Streak & XP")
        .description("Track your daily streak and XP progress")
        .supportedFamilies([.systemSmall])
    }
}

#Preview(as: .systemSmall) {
    StreakWidget()
} timeline: {
    StreakEntry(date: Date(), data: .placeholder)
}
