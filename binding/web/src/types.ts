/*
  Copyright 2026 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { PvModel } from '@picovoice/web-utils';
import { BatError } from './bat_errors';

// eslint-disable-next-line no-shadow
export enum PvStatus {
  SUCCESS = 10000,
  OUT_OF_MEMORY,
  IO_ERROR,
  INVALID_ARGUMENT,
  STOP_ITERATION,
  KEY_ERROR,
  INVALID_STATE,
  RUNTIME_ERROR,
  ACTIVATION_ERROR,
  ACTIVATION_LIMIT_REACHED,
  ACTIVATION_THROTTLED,
  ACTIVATION_REFUSED,
}

// eslint-disable-next-line no-shadow
export enum BatLanguages {
  UNKNOWN = 0,
  DE = 1,
  EN = 2,
  ES = 3,
  FR = 4,
  IT = 5,
  JA = 6,
  KO = 7,
  PT = 8,
}

export const NUM_BAT_LANGUAGES = 9;

export const batLanguageToString = (language: BatLanguages): string | null => {
  switch (Number(language)) {
    case BatLanguages.UNKNOWN:
      return "unknown";
    case BatLanguages.DE:
      return "de";
    case BatLanguages.EN:
      return "en";
    case BatLanguages.ES:
      return "es";
    case BatLanguages.FR:
      return "fr";
    case BatLanguages.IT:
      return "it";
    case BatLanguages.JA:
      return "ja";
    case BatLanguages.KO:
      return "ko";
    case BatLanguages.PT:
      return "pt";
    default:
      return null;
  }

  return null;
};

export const batLanguageFromString = (language: string): BatLanguages | null => {
  switch (language.toLowerCase()) {
    case "unknown":
      return BatLanguages.UNKNOWN;
    case "de":
      return BatLanguages.DE;
    case "en":
      return BatLanguages.EN;
    case "es":
      return BatLanguages.ES;
    case "fr":
      return BatLanguages.FR;
    case "it":
      return BatLanguages.IT;
    case "ja":
      return BatLanguages.JA;
    case "ko":
      return BatLanguages.KO;
    case "pt":
      return BatLanguages.PT;
    default:
      return null;
  }

  return null;
};

/**
 * BatModel types
 */
export type BatModel = PvModel;

export type BatOptions = {
  /** @defaultValue 'best' */
  device?: string;
  /** @defaultValue 0.4 */
  voiceThreshold?: number;
  /** @defaultValue undefined */
  processErrorCallback?: (error: BatError) => void;
};

export type BatScores = Partial<Record<BatLanguages, number>>;

export type BatWorkerInitRequest = {
  command: 'init';
  accessKey: string;
  modelPath: string;
  options: BatOptions;
  wasmSimd: string;
  wasmSimdLib: string;
  wasmPThread: string;
  wasmPThreadLib: string;
  sdk: string;
};

export type BatWorkerProcessRequest = {
  command: 'process';
  inputFrame: Int16Array;
};

export type BatWorkerFlushRequest = {
  command: 'flush';
};

export type BatWorkerReleaseRequest = {
  command: 'release';
};

export type BatWorkerRequest =
  | BatWorkerInitRequest
  | BatWorkerProcessRequest
  | BatWorkerFlushRequest
  | BatWorkerReleaseRequest;

export type BatWorkerFailureResponse = {
  command: 'failed' | 'error';
  status: PvStatus;
  shortMessage: string;
  messageStack: string[];
};

export type BatWorkerInitResponse =
  | BatWorkerFailureResponse
  | {
      command: 'ok';
      frameLength: number;
      sampleRate: number;
      version: string;
    };

export type BatWorkerProcessResponse =
  | BatWorkerFailureResponse
  | {
      command: 'ok';
      scores: BatScores;
    };

export type BatWorkerReleaseResponse =
  | BatWorkerFailureResponse
  | {
      command: 'ok';
    };

export type BatWorkerResponse =
  | BatWorkerInitResponse
  | BatWorkerProcessResponse
  | BatWorkerReleaseResponse;
