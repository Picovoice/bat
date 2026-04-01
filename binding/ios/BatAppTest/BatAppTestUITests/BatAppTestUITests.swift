//
//  Copyright 2026 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import XCTest
import Bat

extension String {
    subscript(index: Int) -> Character {
        return self[self.index(self.startIndex, offsetBy: index)]
    }
}

struct TestData: Decodable {
    var tests: Tests
}

struct Tests: Decodable {
    var language_tests: [LanguageTest]
}

struct LanguageTest: Decodable {
    var models: [String]
    var audio_file: String
    var voice_threshold: Float
    var expected_scores: [String: Float]
}

class BatDemoUITests: XCTestCase {
    let accessKey: String = "{TESTING_ACCESS_KEY_HERE}"
    let device: String = "{TESTING_DEVICE_HERE}"

    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    func processFile(bat: Bat, fileURL: URL) throws -> [BatLanguage: Float32]? {
        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Bat.frameLength) * 2

        var pcmBuffer = [Int16](repeating: 0, count: Int(Bat.frameLength))

        var index = 0
        var scores: [BatLanguage: Float32]?
        while index + frameLengthBytes < data.count {
            _ = pcmBuffer.withUnsafeMutableBytes { data.copyBytes(to: $0, from: index..<(index + frameLengthBytes)) }
            scores = try bat.process(pcmBuffer)
            index += frameLengthBytes
        }

        return scores
    }

    func runTestProcess(
            modelPath: String,
            testAudio: String,
            voiceThreshold: Float,
            expectedScores: [String: Float]
        ) throws {
        let bundle = Bundle(for: type(of: self))
        let audioFileURL: URL = bundle.url(
                forResource: testAudio,
                withExtension: "",
                subdirectory: "test_resources/audio_samples")!

        let bat = try Bat(
                accessKey: accessKey,
                modelPath: modelPath,
                device: device,
                voiceThreshold: voiceThreshold)

        let res = try processFile(bat: bat, fileURL: audioFileURL)
        bat.delete()

        for language in expectedScores.keys {
            XCTAssert(abs(res![BatLanguage.fromString(language)!]! - expectedScores[language]!) < 0.05)
        }
    }

    func testProcess() throws {
        let bundle = Bundle(for: type(of: self))
        let testDataJsonUrl = bundle.url(
            forResource: "test_data",
            withExtension: "json",
            subdirectory: "test_resources")!
        let testDataJsonData = try Data(contentsOf: testDataJsonUrl)
        let testData = try JSONDecoder().decode(TestData.self, from: testDataJsonData)

        for testCase in testData.tests.language_tests {
            for modelFile in testCase.models {
                let modelFileBaseName = (modelFile as NSString).deletingPathExtension
                let modelPath: String = bundle.path(
                    forResource: modelFileBaseName,
                    ofType: "pv",
                    inDirectory: "test_resources/model_files")!

                try XCTContext.runActivity(named: "(\(testCase.audio_file) \(modelFile)") { _ in
                    try runTestProcess(
                            modelPath: modelPath,
                            testAudio: testCase.audio_file,
                            voiceThreshold: testCase.voice_threshold,
                            expectedScores: testCase.expected_scores)
                }
            }
        }
    }

    func testFrameLength() throws {
        XCTAssertGreaterThan(Bat.frameLength, 0)
    }

    func testSampleRate() throws {
        XCTAssertGreaterThan(Bat.sampleRate, 0)
    }

    func testVersion() throws {
        XCTAssertGreaterThan(Bat.version, "")
    }

    func testGetAvailableDevices() throws {
        let devices = try Bat.getAvailableDevices()
        XCTAssert(!devices.isEmpty)
        for device in devices {
            XCTAssert(!device.isEmpty)
        }
    }

    func testMessageStack() throws {
        let bundle = Bundle(for: type(of: self))
        let modelURL: URL = bundle.url(
            forResource: "bat_params",
            withExtension: "pv",
            subdirectory: "test_resources/model_files")!

        var first_error: String = ""
        do {
            let bat = try Bat.init(accessKey: "invalid", modelURL: modelURL, device: device)
            XCTAssertNil(bat)
        } catch {
            first_error = "\(error.localizedDescription)"
            XCTAssert(first_error.count < 1024)
        }

        do {
            let bat = try Bat.init(accessKey: "invalid", modelURL: modelURL, device: device)
            XCTAssertNil(bat)
        } catch {
            XCTAssert("\(error.localizedDescription)".count == first_error.count)
        }
    }

    func testProcessMessageStack() throws {
        let bundle = Bundle(for: type(of: self))
        let modelURL: URL = bundle.url(
            forResource: "bat_params",
            withExtension: "pv",
            subdirectory: "test_resources/model_files")!

        let bat = try Bat(accessKey: accessKey, modelURL: modelURL, device: device)
        bat.delete()

        var testPcm: [Int16] = []
        testPcm.reserveCapacity(Int(Bat.frameLength))

        do {
            let res = try bat.process(testPcm)
            XCTAssertNil(res)
        } catch {
            XCTAssert("\(error.localizedDescription)".count > 0)
        }
    }
}
