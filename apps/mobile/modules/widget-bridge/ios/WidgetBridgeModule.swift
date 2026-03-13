import ExpoModulesCore
import WidgetKit

public class WidgetBridgeModule: Module {
    public func definition() -> ModuleDefinition {
        Name("WidgetBridge")

        Function("setItem") { (key: String, value: String) in
            let defaults = UserDefaults(suiteName: "group.com.ottersprod.lullio.widgets")
            defaults?.set(value, forKey: key)
            defaults?.synchronize()
        }

        Function("reloadWidgets") {
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
    }
}
