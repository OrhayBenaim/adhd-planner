// Widget contract XCTest — add this file to the LullioWidgets widget extension target in Xcode.
// Copy packages/types/src/widget-fixtures into the extension bundle (folder reference) or set
// FIXTURES_DIR in the test target's build settings to point at the repo fixtures path.
//
// Run: select the widget extension scheme → Product → Test (Cmd+U).

import XCTest

final class WidgetDataContractTests: XCTestCase {
    private var fixturesDir: URL {
        let env = ProcessInfo.processInfo.environment["WIDGET_FIXTURES_DIR"]
        if let env, !env.isEmpty {
            return URL(fileURLWithPath: env, isDirectory: true)
        }
        return URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("../../../../../../packages/types/src/widget-fixtures", isDirectory: true)
            .standardizedFileURL
    }

    private lazy var manifest: [String: Any] = {
        let url = fixturesDir.appendingPathComponent("expectations.json")
        let data = try! Data(contentsOf: url)
        return try! JSONSerialization.jsonObject(with: data) as! [String: Any]
    }()

    func testStorageKeysMatchManifest() {
        let keys = manifest["storageKeys"] as! [String: String]
        XCTAssertEqual(WidgetData.storageKey, keys["widgetData"])
        XCTAssertEqual(WidgetData.pendingMoodKey, keys["pendingMood"])
        XCTAssertEqual(WidgetData.pendingTaskCompletionsKey, keys["pendingTaskCompletions"])
    }

    func testDecodesGoldenFixtures() throws {
        let parseOnly = Set(manifest["parseOnlyFixtures"] as! [String])
        let fixtures = manifest["fixtures"] as! [String]
        let boundaries = manifest["moodBoundaries"] as! [[String: Any]]

        for fileName in fixtures where !parseOnly.contains(fileName) {
            let url = fixturesDir.appendingPathComponent(fileName)
            let data = try Data(contentsOf: url)
            let decoded = try JSONDecoder().decode(WidgetData.self, from: data)

            let expected = try JSONSerialization.jsonObject(with: data) as! [String: Any]
            XCTAssertEqual(decoded.isPremium, expected["isPremium"] as? Bool)
            XCTAssertEqual(decoded.streak, expected["streak"] as? Int)
            XCTAssertEqual(decoded.level, expected["level"] as? Int)
            XCTAssertEqual(decoded.moodLevel, expected["moodLevel"] as? Int)

            let moodLevel = decoded.moodLevel
            let boundary = boundaries.first { ($0["level"] as? Int) == moodLevel }
            XCTAssertNotNil(boundary)
            XCTAssertEqual(decoded.moodLabel, boundary?["label"] as? String)
            XCTAssertEqual(decoded.moodEmoji, boundary?["emoji"] as? String)
        }
    }

    func testMalformedJsonReturnsNil() throws {
        let malformedURL = fixturesDir.appendingPathComponent("malformed.json")
        let malformedData = try Data(contentsOf: malformedURL)
        XCTAssertNil(try? JSONDecoder().decode(WidgetData.self, from: malformedData))

        let emptyURL = fixturesDir.appendingPathComponent("empty.json")
        let emptyData = try Data(contentsOf: emptyURL)
        XCTAssertNil(try? JSONDecoder().decode(WidgetData.self, from: emptyData))

        let placeholder = WidgetData.placeholder
        XCTAssertEqual(placeholder.isPremium, false)
        XCTAssertEqual(placeholder.moodLevel, 50)
    }
}
