import WidgetKit
import SwiftUI

struct TodayTaskEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct TodayTaskProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayTaskEntry {
        TodayTaskEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayTaskEntry) -> Void) {
        completion(TodayTaskEntry(date: Date(), data: WidgetData.load() ?? .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayTaskEntry>) -> Void) {
        let entry = TodayTaskEntry(date: Date(), data: WidgetData.load() ?? .placeholder)
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct TodayTaskWidgetView: View {
    let entry: TodayTaskEntry

    var body: some View {
        if !entry.data.isPremium {
            PremiumUpsellView()
        } else {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("📋 Today")
                        .font(.caption)
                        .bold()
                    Spacer()
                    Text("\(entry.data.todayCompletedCount)/\(entry.data.todayTaskCount)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if let task = entry.data.suggestedTask {
                    Text(task)
                        .font(.subheadline)
                        .lineLimit(2)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.blue.opacity(0.08))
                        .cornerRadius(8)
                } else {
                    let remaining = entry.data.todayTaskCount - entry.data.todayCompletedCount
                    Text(remaining > 0 ? "\(remaining) tasks remaining" : "All done! 🎉")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
            }
            .padding()
            .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

struct TodayTaskWidget: Widget {
    let kind = "TodayTaskWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayTaskProvider()) { entry in
            TodayTaskWidgetView(entry: entry)
        }
        .configurationDisplayName("Today's Task")
        .description("See your suggested task for today")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    TodayTaskWidget()
} timeline: {
    TodayTaskEntry(date: Date(), data: .placeholder)
}

#Preview(as: .systemMedium) {
    TodayTaskWidget()
} timeline: {
    TodayTaskEntry(date: Date(), data: .placeholder)
}
