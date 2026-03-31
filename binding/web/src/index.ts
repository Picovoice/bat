import { Bat } from './bat';
import { BatWorker } from './bat_worker';

import {
  BatLanguages,
  batLanguageToString,
  batLanguageFromString,
  BatModel,
  BatOptions,
  BatScores,
  BatWorkerInitRequest,
  BatWorkerProcessRequest,
  BatWorkerReleaseRequest,
  BatWorkerRequest,
  BatWorkerInitResponse,
  BatWorkerProcessResponse,
  BatWorkerReleaseResponse,
  BatWorkerFailureResponse,
  BatWorkerResponse,
} from './types';

import * as BatErrors from './bat_errors';

import batWasmSimd from './lib/pv_bat_simd.wasm';
import batWasmSimdLib from './lib/pv_bat_simd.txt';
import batWasmPThread from './lib/pv_bat_pthread.wasm';
import batWasmPThreadLib from './lib/pv_bat_pthread.txt';

Bat.setWasmSimd(batWasmSimd);
Bat.setWasmSimdLib(batWasmSimdLib);
Bat.setWasmPThread(batWasmPThread);
Bat.setWasmPThreadLib(batWasmPThreadLib);
BatWorker.setWasmSimd(batWasmSimd);
BatWorker.setWasmSimdLib(batWasmSimdLib);
BatWorker.setWasmPThread(batWasmPThread);
BatWorker.setWasmPThreadLib(batWasmPThreadLib);

export {
  Bat,
  BatLanguages,
  batLanguageToString,
  batLanguageFromString,
  BatModel,
  BatOptions,
  BatScores,
  BatWorker,
  BatWorkerInitRequest,
  BatWorkerProcessRequest,
  BatWorkerReleaseRequest,
  BatWorkerRequest,
  BatWorkerInitResponse,
  BatWorkerProcessResponse,
  BatWorkerReleaseResponse,
  BatWorkerFailureResponse,
  BatWorkerResponse,
  BatErrors,
};
