import WidgetKit
import SwiftUI

@main
struct LullioWidgets: WidgetBundle {
    var body: some Widget {
        StreakWidget()
        TodayTaskWidget()
        MoodWidget()
    }
}
