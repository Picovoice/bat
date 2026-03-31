/*
  Copyright 2026 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

import { Mutex } from 'async-mutex';

import {
  base64ToUint8Array,
  arrayBufferToStringAtIndex,
  isAccessKeyValid,
  loadModel,
} from '@picovoice/web-utils';

import createModuleSimd from "./lib/pv_bat_simd";
import createModulePThread from "./lib/pv_bat_pthread";

import { simd } from 'wasm-feature-detect';

import {
  NUM_BAT_LANGUAGES,
  BatModel,
  BatOptions,
  BatScores,
  PvStatus } from './types';

import * as BatErrors from "./bat_errors";
import { pvStatusToException } from './bat_errors';

/**
 * WebAssembly function types
 */
type pv_bat_init_type = (
  accessKey: number,
  modelPath: number,
  device: number,
  voiceThreshold: number,
  object: number) => number;
type pv_bat_process_type = (object: number, pcm: number, scores: number) => number;
type pv_bat_scores_delete_type = (scores: number) => void;
type pv_bat_delete_type = (object: number) => void;
type pv_bat_frame_length_type = () => number;
type pv_sample_rate_type = () => number;
type pv_bat_version_type = () => number;
type pv_set_sdk_type = (sdk: number) => void;
type pv_get_error_stack_type = (messageStack: number, messageStackDepth: number) => number;
type pv_free_error_stack_type = (messageStack: number) => void;
type pv_bat_list_hardware_devices_type = (
  hardwareDevices: number,
  numHardwareDevices: number
) => number;
type pv_bat_free_hardware_devices_type = (
  hardwareDevices: number,
  numHardwareDevices: number
) => number;

/**
 * JavaScript/WebAssembly Binding for Bat
 */

type BatModule = EmscriptenModule & {
  _pv_free: (address: number) => void;

  _pv_bat_scores_delete: pv_bat_scores_delete_type;
  _pv_bat_frame_length: pv_bat_frame_length_type;
  _pv_sample_rate: pv_sample_rate_type;
  _pv_bat_version: pv_bat_version_type;
  _pv_bat_list_hardware_devices: pv_bat_list_hardware_devices_type;
  _pv_bat_free_hardware_devices: pv_bat_free_hardware_devices_type;
  _pv_set_sdk: pv_set_sdk_type;
  _pv_get_error_stack: pv_get_error_stack_type;
  _pv_free_error_stack: pv_free_error_stack_type;

  // em default functions
  addFunction: typeof addFunction;
  ccall: typeof ccall;
  cwrap: typeof cwrap;
}

type BatWasmOutput = {
  module: BatModule;

  pv_bat_process: pv_bat_process_type;
  pv_bat_delete: pv_bat_delete_type;

  frameLength: number;
  sampleRate: number;
  version: string;

  objectAddress: number;
  inputBufferAddress: number;
  scoresAddressAddress: number;
  messageStackAddressAddressAddress: number;
  messageStackDepthAddress: number;
};

const PV_STATUS_SUCCESS = 10000;

export class Bat {
  private _module?: BatModule;

  private readonly _pv_bat_process: pv_bat_process_type;
  private readonly _pv_bat_delete: pv_bat_delete_type;

  private readonly _version: string;
  private readonly _sampleRate: number;
  private readonly _frameLength: number;

  private readonly _processMutex: Mutex;

  private readonly _objectAddress: number;
  private readonly _inputBufferAddress: number;
  private readonly _scoresAddressAddress: number;
  private readonly _messageStackAddressAddressAddress: number;
  private readonly _messageStackDepthAddress: number;

  private static _wasmSimd: string;
  private static _wasmSimdLib: string;
  private static _wasmPThread: string;
  private static _wasmPThreadLib: string;
  private static _sdk: string = "web";

  private static _batMutex = new Mutex();

  private readonly _scoresCallback: (scores: BatScores | null) => void;
  private readonly _processErrorCallback?: (error: BatErrors.BatError) => void;

  private constructor(
    handleWasm: BatWasmOutput,
    scoresCallback: (scores: BatScores | null) => void,
    processErrorCallback?: (error: BatErrors.BatError) => void,
  ) {
    this._module = handleWasm.module;

    this._pv_bat_process = handleWasm.pv_bat_process;
    this._pv_bat_delete = handleWasm.pv_bat_delete;

    this._version = handleWasm.version;
    this._sampleRate = handleWasm.sampleRate;
    this._frameLength = handleWasm.frameLength;

    this._objectAddress = handleWasm.objectAddress;
    this._inputBufferAddress = handleWasm.inputBufferAddress;
    this._scoresAddressAddress = handleWasm.scoresAddressAddress;
    this._messageStackAddressAddressAddress = handleWasm.messageStackAddressAddressAddress;
    this._messageStackDepthAddress = handleWasm.messageStackDepthAddress;

    this._processMutex = new Mutex();

    this._scoresCallback = scoresCallback;
    this._processErrorCallback = processErrorCallback;
  }

  /**
   * Get Bat engine version.
   */
  get version(): string {
    return this._version;
  }

  /**
   * Get frame length.
   */
  get frameLength(): number {
    return this._frameLength;
  }

  /**
   * Get sample rate.
   */
  get sampleRate(): number {
    return this._sampleRate;
  }

  /**
   * Set base64 wasm file with SIMD feature.
   * @param wasmSimd Base64'd wasm file to use to initialize wasm.
   */
  public static setWasmSimd(wasmSimd: string): void {
    if (this._wasmSimd === undefined) {
      this._wasmSimd = wasmSimd;
    }
  }

  /**
   * Set base64 SIMD wasm file in text format.
   * @param wasmSimdLib Base64'd SIMD wasm file in text format.
   */
  public static setWasmSimdLib(wasmSimdLib: string): void {
    if (this._wasmSimdLib === undefined) {
      this._wasmSimdLib = wasmSimdLib;
    }
  }

  /**
   * Set base64 wasm file with SIMD and pthread feature.
   * @param wasmPThread Base64'd wasm file to use to initialize wasm.
   */
  public static setWasmPThread(wasmPThread: string): void {
    if (this._wasmPThread === undefined) {
      this._wasmPThread = wasmPThread;
    }
  }

  /**
   * Set base64 SIMD and thread wasm file in text format.
   * @param wasmPThreadLib Base64'd wasm file in text format.
   */
  public static setWasmPThreadLib(wasmPThreadLib: string): void {
    if (this._wasmPThreadLib === undefined) {
      this._wasmPThreadLib = wasmPThreadLib;
    }
  }

  public static setSdk(sdk: string): void {
    Bat._sdk = sdk;
  }

  /**
   * Creates an instance of the Picovoice Bat spoken language understanding engine.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
   * @param scoresCallback User-defined callback to run after receiving scores result.
   * @param model Bat model options.
   * @param model.base64 The model in base64 string to initialize Bat.
   * @param model.publicPath The model path relative to the public directory.
   * @param model.customWritePath Custom path to save the model in storage.
   * Set to a different name to use multiple models across `bat` instances.
   * @param model.forceWrite Flag to overwrite the model in storage even if it exists.
   * @param model.version Version of the model file. Increment to update the model file in storage.
   * @param options Optional configuration arguments.
   * @param options.device String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
   * suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU device. To
   * select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the
   * target GPU. If set to `cpu`, the engine will run on the CPU with the default number of threads. To specify the
   * number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the desired number of
   * threads.
   * @param options.voiceThreshold Sensitivity threshold for detecting voice. The value should be a number within [0, 1].
   * A higher threshold increases detection confidence at the cost of potentially missing frames of voice.
   * @param options.processErrorCallback User-defined callback invoked if any error happens
   * while processing the audio stream. Its only input argument is the error message.
   *
   * @returns An instance of the Bat engine.
   */
  public static async create(
    accessKey: string,
    scoresCallback: (scores: BatScores | null) => void,
    model: BatModel,
    options: BatOptions = {},
  ): Promise<Bat> {
    const customWritePath = (model.customWritePath) ? model.customWritePath : 'bat_model';
    const modelPath = await loadModel({ ...model, customWritePath });

    return Bat._init(
      accessKey,
      scoresCallback,
      modelPath,
      options
    );
  }

  public static async _init(
    accessKey: string,
    scoresCallback: (scores: BatScores | null) => void,
    modelPath: string,
    options: BatOptions = {},
  ): Promise<Bat> {
    const { processErrorCallback } = options;
    let { device = "best" } = options;

    if (!isAccessKeyValid(accessKey)) {
      throw new BatErrors.BatInvalidArgumentError('Invalid AccessKey');
    }

    const isSimd = await simd();
    if (!isSimd) {
      throw new BatErrors.BatRuntimeError('Browser not supported.');
    }

    const isWorkerScope =
      typeof WorkerGlobalScope !== 'undefined' &&
      self instanceof WorkerGlobalScope;
    if (
      !isWorkerScope &&
      (device === 'best' || (device.startsWith('cpu') && device !== 'cpu:1'))
    ) {
      // eslint-disable-next-line no-console
      console.warn('Multi-threading is not supported on main thread.');
      device = 'cpu:1';
    }

    const sabDefined = typeof SharedArrayBuffer !== 'undefined'
      && (device !== "cpu:1");

    return new Promise<Bat>((resolve, reject) => {
      Bat._batMutex
        .runExclusive(async () => {
          const wasmOutput = await Bat.initWasm(
            accessKey.trim(),
            modelPath.trim(),
            device,
            (sabDefined) ? this._wasmPThread : this._wasmSimd,
            (sabDefined) ? this._wasmPThreadLib : this._wasmSimdLib,
            (sabDefined) ? createModulePThread : createModuleSimd,
            options);
          return new Bat(wasmOutput, scoresCallback, processErrorCallback);
        })
        .then((result: Bat) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  /**
   * Processes a frame of audio. The required sample rate can be retrieved from '.sampleRate' and the length
   * of frame (number of audio samples per frame) can be retrieved from '.frameLength' The audio needs to be
   * 16-bit linearly-encoded. Furthermore, the engine operates on single-channel audio.
   *
   * @param pcm A frame of audio with properties described above.
   */
  public async process(pcm: Int16Array): Promise<void> {
    if (!(pcm instanceof Int16Array)) {
      const error = new BatErrors.BatInvalidArgumentError('The argument \'pcm\' must be provided as an Int16Array');
      if (this._processErrorCallback) {
        this._processErrorCallback(error);
      } else {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }

    this._processMutex
      .runExclusive(async () => {
        if (this._module === undefined) {
          throw new BatErrors.BatInvalidStateError('Attempted to call Bat process after release.');
        }

        this._module.HEAP16.set(
          pcm,
          this._inputBufferAddress / Int16Array.BYTES_PER_ELEMENT,
        );

        const status = await this._pv_bat_process(
          this._objectAddress,
          this._inputBufferAddress,
          this._scoresAddressAddress,
        );

        if (status !== PV_STATUS_SUCCESS) {
          const messageStack = Bat.getMessageStack(
            this._module._pv_get_error_stack,
            this._module._pv_free_error_stack,
            this._messageStackAddressAddressAddress,
            this._messageStackDepthAddress,
            this._module.HEAP32,
            this._module.HEAPU8
          );

          const error = pvStatusToException(status, "Processing failed", messageStack);
          if (this._processErrorCallback) {
            this._processErrorCallback(error);
          } else {
            // eslint-disable-next-line no-console
            console.error(error);
          }
          return;
        }

        const scoresAddress = this._module.HEAP32[this._scoresAddressAddress / Int32Array.BYTES_PER_ELEMENT];

        if (scoresAddress) {
          const scores: BatScores = {};
          for (let i = 0; i < NUM_BAT_LANGUAGES; i++) {
            scores[i] = this._module.HEAPF32[(scoresAddress / Float32Array.BYTES_PER_ELEMENT) + i];
          }
          this._module._pv_bat_scores_delete(scoresAddress);
          this._module.HEAP32[this._scoresAddressAddress / Int32Array.BYTES_PER_ELEMENT] = 0;

          this._scoresCallback(scores);
        } else {
          this._scoresCallback(null);
        }
      })
      .catch(async (error: any) => {
        if (this._processErrorCallback) {
          this._processErrorCallback(error);
        } else {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      });
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    if (!this._module) {
      return;
    }
    this._pv_bat_delete(this._objectAddress);
    this._module._pv_free(this._messageStackAddressAddressAddress);
    this._module._pv_free(this._messageStackDepthAddress);
    this._module._pv_free(this._inputBufferAddress);
    this._module._pv_free(this._scoresAddressAddress);
    this._module = undefined;
  }

  async onmessage(e: MessageEvent): Promise<void> {
    switch (e.data.command) {
      case 'process':
        await this.process(e.data.inputFrame);
        break;
      default:
        // eslint-disable-next-line no-console
        console.warn(`Unrecognized command: ${e.data.command}`);
    }
  }

  private static async initWasm(
    accessKey: string,
    modelPath: string,
    device: string,
    wasmBase64: string,
    wasmLibBase64: string,
    createModuleFunc: any,
    options: BatOptions,
  ): Promise<BatWasmOutput> {
    const {
      voiceThreshold = 0.4,
    } = options;

    if (typeof voiceThreshold !== 'number' || voiceThreshold < 0 || voiceThreshold > 1) {
      throw new BatErrors.BatInvalidArgumentError('Bat voiceThreshold must be a number between 0 and 1');
    }

    const blob = new Blob(
      [base64ToUint8Array(wasmLibBase64)],
      { type: 'application/javascript' }
    );
    const module: BatModule = await createModuleFunc({
      mainScriptUrlOrBlob: blob,
      wasmBinary: base64ToUint8Array(wasmBase64),
    });

    const pv_bat_init: pv_bat_init_type = this.wrapAsyncFunction(
      module,
      "pv_bat_init",
      5);
    const pv_bat_delete: pv_bat_delete_type = this.wrapAsyncFunction(
      module,
      "pv_bat_delete",
      1);
    const pv_bat_process: pv_bat_process_type = this.wrapAsyncFunction(
      module,
      "pv_bat_process",
      3);

    const scoresAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (scoresAddressAddress === 0) {
      throw new BatErrors.BatOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const objectAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (objectAddressAddress === 0) {
      throw new BatErrors.BatOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const accessKeyAddress = module._malloc((accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (accessKeyAddress === 0) {
      throw new BatErrors.BatOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    for (let i = 0; i < accessKey.length; i++) {
      module.HEAPU8[accessKeyAddress + i] = accessKey.charCodeAt(i);
    }
    module.HEAPU8[accessKeyAddress + accessKey.length] = 0;

    const modelPathEncoded = new TextEncoder().encode(modelPath);
    const modelPathAddress = module._malloc((modelPathEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT);

    if (modelPathAddress === 0) {
      throw new BatErrors.BatOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    module.HEAPU8.set(modelPathEncoded, modelPathAddress);
    module.HEAPU8[modelPathAddress + modelPathEncoded.length] = 0;

    const deviceEncoded = new TextEncoder().encode(device);
    const deviceAddress = module._malloc((device.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (deviceAddress === 0) {
      throw new BatErrors.BatOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }
    module.HEAP8.set(deviceEncoded, deviceAddress);
    module.HEAPU8[deviceAddress + deviceEncoded.length] = 0;

    const sdkEncoded = new TextEncoder().encode(this._sdk);
    const sdkAddress = module._malloc((sdkEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (!sdkAddress) {
      throw new BatErrors.BatOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    module.HEAPU8.set(sdkEncoded, sdkAddress);
    module.HEAPU8[sdkAddress + sdkEncoded.length] = 0;
    module._pv_set_sdk(sdkAddress);
    module._pv_free(sdkAddress);

    const messageStackDepthAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (!messageStackDepthAddress) {
      throw new BatErrors.BatOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const messageStackAddressAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (!messageStackAddressAddressAddress) {
      throw new BatErrors.BatOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const status = await pv_bat_init(
      accessKeyAddress,
      modelPathAddress,
      deviceAddress,
      voiceThreshold,
      objectAddressAddress);
    module._pv_free(accessKeyAddress);
    module._pv_free(modelPathAddress);
    module._pv_free(deviceAddress);

    if (status !== PV_STATUS_SUCCESS) {
      const messageStack = Bat.getMessageStack(
        module._pv_get_error_stack,
        module._pv_free_error_stack,
        messageStackAddressAddressAddress,
        messageStackDepthAddress,
        module.HEAP32,
        module.HEAPU8,
      );

      throw pvStatusToException(status, "Initialization failed", messageStack);
    }

    const objectAddress = module.HEAP32[objectAddressAddress / Int32Array.BYTES_PER_ELEMENT];
    module._pv_free(objectAddressAddress);

    const frameLength = module._pv_bat_frame_length();
    const sampleRate = module._pv_sample_rate();
    const versionAddress = module._pv_bat_version();
    const version = arrayBufferToStringAtIndex(
      module.HEAPU8,
      versionAddress,
    );

    const inputBufferAddress = module._malloc(frameLength * Int16Array.BYTES_PER_ELEMENT);
    if (inputBufferAddress === 0) {
      throw new BatErrors.BatOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    return {
      module: module,

      pv_bat_process: pv_bat_process,
      pv_bat_delete: pv_bat_delete,

      frameLength: frameLength,
      sampleRate: sampleRate,
      version: version,

      objectAddress: objectAddress,
      inputBufferAddress: inputBufferAddress,
      scoresAddressAddress: scoresAddressAddress,
      messageStackAddressAddressAddress: messageStackAddressAddressAddress,
      messageStackDepthAddress: messageStackDepthAddress,
    };
  }

  /**
   * Lists all available devices that Bat can use for inference.
   * Each entry in the list can be the used as the `device` argument for the `.create` method.
   *
   * @returns List of all available devices that Bat can use for inference.
   */
  public static async listAvailableDevices(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      Bat._batMutex
        .runExclusive(async () => {
          const isSimd = await simd();
          if (!isSimd) {
            throw new BatErrors.BatRuntimeError('Unsupported Browser');
          }

          const blob = new Blob(
            [base64ToUint8Array(this._wasmSimdLib)],
            { type: 'application/javascript' }
          );
          const module: BatModule = await createModuleSimd({
            mainScriptUrlOrBlob: blob,
            wasmBinary: base64ToUint8Array(this._wasmSimd),
          });

          const hardwareDevicesAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
          if (hardwareDevicesAddressAddress === 0) {
            throw new BatErrors.BatOutOfMemoryError(
              'malloc failed: Cannot allocate memory for hardwareDevices'
            );
          }

          const numHardwareDevicesAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
          if (numHardwareDevicesAddress === 0) {
            throw new BatErrors.BatOutOfMemoryError(
              'malloc failed: Cannot allocate memory for numHardwareDevices'
            );
          }

          const status: PvStatus = module._pv_bat_list_hardware_devices(
            hardwareDevicesAddressAddress,
            numHardwareDevicesAddress
          );

          const messageStackDepthAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
          if (!messageStackDepthAddress) {
            throw new BatErrors.BatOutOfMemoryError(
              'malloc failed: Cannot allocate memory for messageStackDepth'
            );
          }

          const messageStackAddressAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
          if (!messageStackAddressAddressAddress) {
            throw new BatErrors.BatOutOfMemoryError(
              'malloc failed: Cannot allocate memory messageStack'
            );
          }

          if (status !== PvStatus.SUCCESS) {
            const messageStack = await Bat.getMessageStack(
              module._pv_get_error_stack,
              module._pv_free_error_stack,
              messageStackAddressAddressAddress,
              messageStackDepthAddress,
              module.HEAP32,
              module.HEAPU8,
            );
            module._pv_free(messageStackAddressAddressAddress);
            module._pv_free(messageStackDepthAddress);

            throw pvStatusToException(
              status,
              'List devices failed',
              messageStack
            );
          }
          module._pv_free(messageStackAddressAddressAddress);
          module._pv_free(messageStackDepthAddress);

          const numHardwareDevices: number = module.HEAP32[numHardwareDevicesAddress / Int32Array.BYTES_PER_ELEMENT];
          module._pv_free(numHardwareDevicesAddress);

          const hardwareDevicesAddress = module.HEAP32[hardwareDevicesAddressAddress / Int32Array.BYTES_PER_ELEMENT];

          const hardwareDevices: string[] = [];
          for (let i = 0; i < numHardwareDevices; i++) {
            const deviceAddress = module.HEAP32[hardwareDevicesAddress / Int32Array.BYTES_PER_ELEMENT + i];
            hardwareDevices.push(arrayBufferToStringAtIndex(module.HEAPU8, deviceAddress));
          }
          module._pv_bat_free_hardware_devices(
            hardwareDevicesAddress,
            numHardwareDevices
          );
          module._pv_free(hardwareDevicesAddressAddress);

          return hardwareDevices;
        })
        .then((result: string[]) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  private static getMessageStack(
    pv_get_error_stack: pv_get_error_stack_type,
    pv_free_error_stack: pv_free_error_stack_type,
    messageStackAddressAddressAddress: number,
    messageStackDepthAddress: number,
    memoryBufferInt32: Int32Array,
    memoryBufferUint8: Uint8Array,
  ): string[] {
    const status = pv_get_error_stack(messageStackAddressAddressAddress, messageStackDepthAddress);
    if (status !== PvStatus.SUCCESS) {
      throw new Error(`Unable to get error state: ${status}`);
    }

    const messageStackAddressAddress = memoryBufferInt32[messageStackAddressAddressAddress / Int32Array.BYTES_PER_ELEMENT];

    const messageStackDepth = memoryBufferInt32[messageStackDepthAddress / Int32Array.BYTES_PER_ELEMENT];
    const messageStack: string[] = [];
    for (let i = 0; i < messageStackDepth; i++) {
      const messageStackAddress = memoryBufferInt32[(messageStackAddressAddress / Int32Array.BYTES_PER_ELEMENT) + i];
      const message = arrayBufferToStringAtIndex(memoryBufferUint8, messageStackAddress);
      messageStack.push(message);
    }

    pv_free_error_stack(messageStackAddressAddress);

    return messageStack;
  }

  private static wrapAsyncFunction(module: BatModule, functionName: string, numArgs: number): (...args: any[]) => any {
    // @ts-ignore
    return module.cwrap(
      functionName,
      "number",
      Array(numArgs).fill("number"),
      { async: true }
    );
  }
}
