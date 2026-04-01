/*
  Copyright 2026 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/// <reference no-default-lib="false"/>
/// <reference lib="webworker" />

import { Bat } from './bat';
import { BatScores, BatWorkerRequest, PvStatus } from './types';
import { BatError } from "./bat_errors";

let bat: Bat | null = null;

const scoresCallback = (scores: BatScores | null): void => {
  self.postMessage({
    command: 'ok',
    scores: scores,
  });
};

const processErrorCallback = (error: BatError): void => {
  self.postMessage({
    command: 'error',
    status: error.status,
    shortMessage: error.shortMessage,
    messageStack: error.messageStack
  });
};

/**
 * Bat worker handler.
 */
self.onmessage = async function (
  event: MessageEvent<BatWorkerRequest>
): Promise<void> {
  switch (event.data.command) {
    case 'init':
      if (bat !== null) {
        self.postMessage({
          command: 'error',
          status: PvStatus.INVALID_STATE,
          shortMessage: 'Bat already initialized',
        });
        return;
      }
      try {
        Bat.setWasmSimd(event.data.wasmSimd);
        Bat.setWasmSimdLib(event.data.wasmSimdLib);
        Bat.setWasmPThread(event.data.wasmPThread);
        Bat.setWasmPThreadLib(event.data.wasmPThreadLib);
        bat = await Bat._init(
          event.data.accessKey,
          scoresCallback,
          event.data.modelPath,
          { ...event.data.options, processErrorCallback }
        );
        self.postMessage({
          command: 'ok',
          version: bat.version,
          frameLength: bat.frameLength,
          sampleRate: bat.sampleRate,
        });
      } catch (e: any) {
        if (e instanceof BatError) {
          self.postMessage({
            command: 'error',
            status: e.status,
            shortMessage: e.shortMessage,
            messageStack: e.messageStack
          });
        } else {
          self.postMessage({
            command: 'error',
            status: PvStatus.RUNTIME_ERROR,
            shortMessage: e.message
          });
        }
      }
      break;
    case 'process':
      if (bat === null) {
        self.postMessage({
          command: 'error',
          status: PvStatus.INVALID_STATE,
          shortMessage: 'Bat not initialized',
        });
        return;
      }
      await bat.process(event.data.inputFrame);
      break;
    case 'release':
      if (bat !== null) {
        await bat.release();
        bat = null;
        close();
      }
      self.postMessage({
        command: 'ok',
      });
      break;
    default:
      self.postMessage({
        command: 'failed',
        status: PvStatus.RUNTIME_ERROR,
        // @ts-ignore
        shortMessage: `Unrecognized command: ${event.data.command}`,
      });
  }
};
