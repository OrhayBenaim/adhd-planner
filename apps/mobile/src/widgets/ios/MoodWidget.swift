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

private let moodOptions: [(emoji: String, level: Int)] = [
    ("😢", 10),
    ("😔", 30),
    ("😐", 50),
    ("🙂", 70),
    ("😊", 90),
]

struct MoodWidgetView: View {
    let entry: MoodEntry

    var body: some View {
        VStack(spacing: 6) {
            Text(entry.data.moodEmoji)
                .font(.system(size: 28))
            Text(entry.data.moodLabel)
                .font(.caption)
                .bold()
                .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))

            if #available(iOS 17.0, *) {
                HStack(spacing: 4) {
                    ForEach(moodOptions, id: \.level) { option in
                        Button(intent: SetMoodIntent(moodLevel: option.level)) {
                            Text(option.emoji)
                                .font(.system(size: 16))
                        }
                        .buttonStyle(.plain)
                    }
                }
            } else {
                Text("Tap to check in")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
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

#Preview(as: .systemSmall) {
    MoodWidget()
} timeline: {
    MoodEntry(date: Date(), data: .placeholder)
}
