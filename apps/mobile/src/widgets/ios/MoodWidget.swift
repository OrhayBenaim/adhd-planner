import WidgetKit
import SwiftUI

struct MoodEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct MoodProvider: TimelineProvider {
    func placeholder(in context: Context) -> MoodEntry {
        MoodEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (MoodEntry) -> Void) {
        completion(MoodEntry(date: Date(), data: WidgetData.load() ?? .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MoodEntry>) -> Void) {
        let entry = MoodEntry(date: Date(), data: WidgetData.load() ?? .placeholder)
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct MoodWidgetView: View {
    let entry: MoodEntry

    var body: some View {
        if !entry.data.isPremium {
            PremiumUpsellView()
        } else {
            VStack(spacing: 6) {
                Text(entry.data.moodEmoji)
                    .font(.system(size: 36))
                Text(entry.data.moodLabel)
                    .font(.subheadline)
                    .bold()
                    .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))
                Text("Tap to check in")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding()
            .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

struct MoodWidget: Widget {
    let kind = "MoodWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MoodProvider()) { entry in
            MoodWidgetView(entry: entry)
        }
        .configurationDisplayName("Mood Check-in")
        .description("See your current mood at a glance")
        .supportedFamilies([.systemSmall])
    }
}
