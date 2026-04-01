//
//  Copyright 2026 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import Foundation

import Bat
import ios_voice_processor

enum UIState {
    case INIT
    case READY
    case RECORDING
    case FINALIZED
    case ERROR
}

class ViewModel: ObservableObject {
    private let ACCESS_KEY = "${YOUR_ACCESS_KEY_HERE}" // Obtained from Picovoice Console (https://console.picovoice.ai)

    private var bat: Bat!

    private var isListening = false
    private var autoScroll = true

    private let voiceProcessorFrameLengthSecs: Float = 0.75
    private var pcmBuffer: [Int16] = Array()

    @Published var errorMessage = ""
    @Published var state = UIState.INIT
    @Published var scoresResult: [String: Float32] = Dictionary()
    @Published var scoresMessage = ""

    init() {
        initialize()
    }

    public func initialize() {
        state = UIState.INIT
        do {
            try bat = Bat(
                    accessKey: ACCESS_KEY,
                    voiceThreshold: 0.4)

            VoiceProcessor.instance.addFrameListener(VoiceProcessorFrameListener(audioCallback))
            VoiceProcessor.instance.addErrorListener(VoiceProcessorErrorListener(errorCallback))

            state = UIState.READY
        } catch let error as BatInvalidArgumentError {
            errorMessage = "\(error.localizedDescription)"
        } catch is BatActivationError {
            errorMessage = "ACCESS_KEY activation error"
        } catch is BatActivationRefusedError {
            errorMessage = "ACCESS_KEY activation refused"
        } catch is BatActivationLimitError {
            errorMessage = "ACCESS_KEY reached its limit"
        } catch is BatActivationThrottledError {
            errorMessage = "ACCESS_KEY is throttled"
        } catch {
            errorMessage = "\(error)"
        }
    }

    public func destroy() {
        if isListening {
            toggleRecordingOff()
        }
        bat.delete()
    }

    public func toggleRecording() {
        if isListening {
            toggleRecordingOff()
        } else {
            toggleRecordingOn()
        }
    }

    public func toggleRecordingOff() {
        do {
            try VoiceProcessor.instance.stop()
            state = UIState.FINALIZED
            isListening = false
        } catch {
            errorMessage = "\(error.localizedDescription)"
        }
    }

    public func toggleRecordingOn() {
        do {
            guard VoiceProcessor.hasRecordAudioPermission else {
                VoiceProcessor.requestRecordAudioPermission { isGranted in
                    guard isGranted else {
                        DispatchQueue.main.async {
                            self.errorMessage = "Demo requires microphone permission"
                        }
                        return
                    }

                    DispatchQueue.main.async {
                        self.toggleRecordingOn()
                    }
                }
                return
            }

            let voiceProcessorFrameLength = UInt32(voiceProcessorFrameLengthSecs * Float(Bat.sampleRate))

            try VoiceProcessor.instance.start(
                    frameLength: voiceProcessorFrameLength,
                    sampleRate: Bat.sampleRate
            )

            for language in BatLanguage.allCases {
                scoresResult[language.toString()] = 0.0
            }
            scoresMessage = ""

            state = UIState.RECORDING
            isListening = true
        } catch {
            errorMessage = "\(error.localizedDescription)"
        }
    }

    public func shouldAutoScroll() -> Bool {
        autoScroll
    }

    public func setAutoScroll(_ value: Bool) {
        autoScroll = value
    }

    private func audioCallback(frame: [Int16]) {
        guard let bat = self.bat else {
            return
        }

        do {
            pcmBuffer.append(contentsOf: frame)

            if pcmBuffer.count >= Bat.frameLength {
                let scores = try bat.process(Array(pcmBuffer[0..<Int(Bat.frameLength)]))
                if scores != nil {
                    for language in scores!.keys {
                        scoresResult[language.toString()] = scores![language]
                    }
                    scoresMessage = ""
                } else {
                    for language in scoresResult.keys {
                        scoresResult[language] = 0.0
                    }
                    scoresMessage = "(no voice detected)"
                }
                pcmBuffer.removeFirst(Int(Bat.frameLength))
            }
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = "\(error)"
            }
        }
    }

    private func errorCallback(error: VoiceProcessorError) {
        DispatchQueue.main.async {
            self.errorMessage = "\(error)"
        }
    }
}
