//
//  Copyright 2026 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import Foundation

import PvBat

/// iOS binding for Bat spoken language understanding engine. Provides a Swift interface to the Bat library.
public class Bat {

#if SWIFT_PACKAGE

    static let resourceBundle = Bundle.module

#else

    static let resourceBundle: Bundle = {
        let myBundle = Bundle(for: Bat.self)

        guard let resourceBundleURL = myBundle.url(
                forResource: "BatResources", withExtension: "bundle")
                else {
            fatalError("BatResources.bundle not found")
        }

        guard let resourceBundle = Bundle(url: resourceBundleURL)
                else {
            fatalError("Could not open BatResources.bundle")
        }

        return resourceBundle
    }()

#endif

    private var handle: OpaquePointer?

    /// The number of audio samples per frame.
    public static let frameLength = UInt32(pv_bat_frame_length())

    /// Audio sample rate accepted by Bat.
    public static let sampleRate = UInt32(pv_sample_rate())

    /// Current Bat version.
    public static let version = String(cString: pv_bat_version())

    private static var sdk = "ios"

    public static func setSdk(sdk: String) {
        self.sdk = sdk
    }

    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: The AccessKey obtained from Picovoice Console (https://console.picovoice.ai).
    ///   - modelPath: Absolute path to file containing model parameters.
    ///   - device: String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
    ///     suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU
    ///     device. To select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}`
    ///     is the index of the target GPU. If set to `cpu`, the engine will run on the CPU with the default
    ///     number of threads. To specify the number of threads, set this argument to `cpu:${NUM_THREADS}`,
    ///     where `${NUM_THREADS}` is the desired number of threads.
    ///   - voiceThreshold: Sensitivity threshold for detecting voice. The value should be a number within [0, 1].
    ///     A higher threshold increases detection confidence at the cost of potentially missing frames of voice.
    ///     Default is 0.4 second.
    /// - Throws: BatError
    public init(
            accessKey: String,
            modelPath: String? = nil,
            device: String? = nil,
            voiceThreshold: Float = 0.4) throws {

        if accessKey.count == 0 {
            throw BatInvalidArgumentError("AccessKey is required for Bat initialization")
        }

        var modelPathArg = modelPath
        if modelPathArg == nil {
            modelPathArg = Bat.resourceBundle.path(forResource: "bat_params", ofType: "pv")
            if modelPathArg == nil {
                throw BatIOError("Could not find default model file in app bundle.")
            }
        }

        if !FileManager().fileExists(atPath: modelPathArg!) {
            modelPathArg = try getResourcePath(modelPathArg!)
        }

        var deviceArg = device
        if device == nil {
            deviceArg = "best"
        }

        if voiceThreshold < 0 || voiceThreshold > 1 {
            throw BatInvalidArgumentError("voiceThreshold must be between 0 and 1.")
        }

        pv_set_sdk(Bat.sdk)

        let status = pv_bat_init(
                accessKey,
                modelPathArg,
                deviceArg,
                voiceThreshold,
                &handle)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Bat.getMessageStack()
            throw Bat.pvStatusToBatError(status, "Bat init failed", messageStack)
        }
    }

    deinit {
        self.delete()
    }

    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: The AccessKey obtained from Picovoice Console (https://console.picovoice.ai).
    ///   - modelURL: URL to file containing model parameters.
    ///   - device: String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
    ///     suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU
    ///     device. To select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}`
    ///     is the index of the target GPU. If set to `cpu`, the engine will run on the CPU with the default
    ///     number of threads. To specify the number of threads, set this argument to `cpu:${NUM_THREADS}`,
    ///     where `${NUM_THREADS}` is the desired number of threads.
    ///   - voiceThreshold: Sensitivity threshold for detecting voice. The value should be a number within [0, 1].
    ///     A higher threshold increases detection confidence at the cost of potentially missing frames of voice.
    ///     Default is 0.4 second.
    /// - Throws: BatError
    public convenience init(
            accessKey: String,
            modelURL: URL,
            device: String? = nil,
            voiceThreshold: Float = 0.4) throws {
        try self.init(
                accessKey: accessKey,
                modelPath: modelURL.path,
                device: device,
                voiceThreshold: voiceThreshold)
    }

    /// Releases native resources that were allocated to Bat
    public func delete() {
        if handle != nil {
            pv_bat_delete(handle)
            handle = nil
        }
    }

    /// Processes a frame of audio and returns language detection scores.
    ///
    /// - Parameters:
    ///   - pcm: A frame of audio samples. The number of samples per frame can be attained by calling
    ///     `Bat.frame_length`. The incoming audio needs to have a sample rate equal to `Bat.sample_rate`
    ///      and be 16-bit linearly-encoded. Furthermore, Bat operates on single-channel audio.
    /// - Throws: BatError
    /// - Returns: Detection score for each supported language. The scores are in the range [0, 1]
    ///            with 1 being maximum confidence in a detection. The index of each scores corresponds
    ///            to the `BatLanguage` enum value, and the length of the array is `BatLanguage.numLanguages()`
    ///            elements long. If `nil` is returned, Bat did not detect usable voice in the frame.
    public func process(_ pcm: [Int16]) throws -> [BatLanguage: Float32]? {
        if handle == nil {
            throw BatInvalidStateError("Bat must be initialized before processing")
        }

        if pcm.count != Bat.frameLength {
            throw BatInvalidArgumentError(
                "Frame of audio data must contain \(Bat.frameLength) samples" +
                " - given frame contained \(pcm.count)")
        }

        var cScores: UnsafeMutablePointer<Float32>?
        let status = pv_bat_process(self.handle, pcm, &cScores)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Bat.getMessageStack()
            throw Bat.pvStatusToBatError(status, "Bat process failed", messageStack)
        }

        if cScores != nil {
            var scores: [BatLanguage: Float32] = [:]
            for i in 0..<BatLanguage.numLanguages() {
                let language = BatLanguage(rawValue: Int(i)) ?? BatLanguage.UNKNOWN
                scores[language] = cScores![Int(i)]
            }
            pv_bat_scores_delete(cScores)
            return scores
        }
        return nil
    }

    /// Given a path, return the full path to the resource.
    ///
    /// - Parameters:
    ///   - filePath: relative path of a file in the bundle.
    /// - Throws: LeopardIOError
    /// - Returns: The full path of the resource.
    private func getResourcePath(_ filePath: String) throws -> String {
        if let resourcePath = Bundle(for: type(of: self)).resourceURL?.appendingPathComponent(filePath).path {
            if FileManager.default.fileExists(atPath: resourcePath) {
                return resourcePath
            }
        }

        throw BatIOError(
            "Could not find file at path '\(filePath)'. If this is a packaged asset, " +
            "ensure you have added it to your xcode project."
        )
    }

    /// Lists all available devices that Bat can use for inference.
    /// Entries in the list can be used as the `device` argument when initializing Bat.
    ///
    /// - Throws: BatError
    /// - Returns: Array of available devices that Bat can be used for inference.
    public static func getAvailableDevices() throws -> [String] {
        var cHardwareDevices: UnsafeMutablePointer<UnsafeMutablePointer<Int8>?>?
        var numHardwareDevices: Int32 = 0
        let status = pv_bat_list_hardware_devices(&cHardwareDevices, &numHardwareDevices)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Bat.getMessageStack()
            throw Bat.pvStatusToBatError(status, "Bat getAvailableDevices failed", messageStack)
        }

        var hardwareDevices: [String] = []
        for i in 0..<numHardwareDevices {
            hardwareDevices.append(String(cString: cHardwareDevices!.advanced(by: Int(i)).pointee!))
        }

        pv_bat_free_hardware_devices(cHardwareDevices, numHardwareDevices)

        return hardwareDevices
    }

    private static func pvStatusToBatError(
        _ status: pv_status_t,
        _ message: String,
        _ messageStack: [String] = []) -> BatError {
        switch status {
        case PV_STATUS_OUT_OF_MEMORY:
            return BatMemoryError(message, messageStack)
        case PV_STATUS_IO_ERROR:
            return BatIOError(message, messageStack)
        case PV_STATUS_INVALID_ARGUMENT:
            return BatInvalidArgumentError(message, messageStack)
        case PV_STATUS_STOP_ITERATION:
            return BatStopIterationError(message, messageStack)
        case PV_STATUS_KEY_ERROR:
            return BatKeyError(message, messageStack)
        case PV_STATUS_INVALID_STATE:
            return BatInvalidStateError(message, messageStack)
        case PV_STATUS_RUNTIME_ERROR:
            return BatRuntimeError(message, messageStack)
        case PV_STATUS_ACTIVATION_ERROR:
            return BatActivationError(message, messageStack)
        case PV_STATUS_ACTIVATION_LIMIT_REACHED:
            return BatActivationLimitError(message, messageStack)
        case PV_STATUS_ACTIVATION_THROTTLED:
            return BatActivationThrottledError(message, messageStack)
        case PV_STATUS_ACTIVATION_REFUSED:
            return BatActivationRefusedError(message, messageStack)
        default:
            let pvStatusString = String(cString: pv_status_to_string(status))
            return BatError("\(pvStatusString): \(message)", messageStack)
        }
    }

    private static func getMessageStack() throws -> [String] {
        var messageStackRef: UnsafeMutablePointer<UnsafeMutablePointer<Int8>?>?
        var messageStackDepth: Int32 = 0
        let status = pv_get_error_stack(&messageStackRef, &messageStackDepth)
        if status != PV_STATUS_SUCCESS {
            throw Bat.pvStatusToBatError(status, "Unable to get Bat error state")
        }

        var messageStack: [String] = []
        for i in 0..<messageStackDepth {
            messageStack.append(String(cString: messageStackRef!.advanced(by: Int(i)).pointee!))
        }

        pv_free_error_stack(messageStackRef)

        return messageStack
    }
}
