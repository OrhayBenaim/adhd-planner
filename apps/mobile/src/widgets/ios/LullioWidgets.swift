import WidgetKit
import SwiftUI

struct PremiumUpsellView: View {
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: "star.fill")
                .foregroundColor(.yellow)
                .font(.title3)
            Text("Upgrade to Pro")
                .font(.caption)
                .bold()
            Text("for home widgets")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .widgetURL(URL(string: "lullio://paywall"))
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

@main
struct LullioWidgets: WidgetBundle {
    var body: some Widget {
        StreakWidget()
        TodayTaskWidget()
        MoodWidget()
    }
}
