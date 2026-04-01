//
// Copyright 2026 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import { PvError } from "@picovoice/web-utils";
import { PvStatus } from "./types";

class BatError extends Error {
  private readonly _status: PvStatus;
  private readonly _shortMessage: string;
  private readonly _messageStack: string[];

  constructor(status: PvStatus, message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(BatError.errorToString(message, messageStack, pvError));
    this._status = status;
    this.name = 'BatError';
    this._shortMessage = message;
    this._messageStack = messageStack;
  }

  get status(): PvStatus {
    return this._status;
  }

  get shortMessage(): string {
    return this._shortMessage;
  }

  get messageStack(): string[] {
    return this._messageStack;
  }

  private static errorToString(
    initial: string,
    messageStack: string[],
    pvError: PvError | null = null,
  ): string {
    let msg = initial;

    if (pvError) {
      const pvErrorMessage = pvError.getErrorString();
      if (pvErrorMessage.length > 0) {
        msg += `\nDetails: ${pvErrorMessage}`;
      }
    }

    if (messageStack.length > 0) {
      msg += `: ${messageStack.reduce((acc, value, index) =>
        acc + '\n  [' + index + '] ' + value, '')}`;
    }

    return msg;
  }
}

class BatOutOfMemoryError extends BatError {
  constructor(message: string, messageStack?: string[], pvError: PvError | null = null) {
    super(PvStatus.OUT_OF_MEMORY, message, messageStack, pvError);
    this.name = 'BatOutOfMemoryError';
  }
}

class BatIOError extends BatError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.IO_ERROR, message, messageStack, pvError);
    this.name = 'BatIOError';
  }
}

class BatInvalidArgumentError extends BatError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.INVALID_ARGUMENT, message, messageStack, pvError);
    this.name = 'BatInvalidArgumentError';
  }
}

class BatStopIterationError extends BatError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.STOP_ITERATION, message, messageStack, pvError);
    this.name = 'BatStopIterationError';
  }
}

class BatKeyError extends BatError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.KEY_ERROR, message, messageStack, pvError);
    this.name = 'BatKeyError';
  }
}

class BatInvalidStateError extends BatError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.INVALID_STATE, message, messageStack, pvError);
    this.name = 'BatInvalidStateError';
  }
}

class BatRuntimeError extends BatError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.RUNTIME_ERROR, message, messageStack, pvError);
    this.name = 'BatRuntimeError';
  }
}

class BatActivationError extends BatError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.ACTIVATION_ERROR, message, messageStack, pvError);
    this.name = 'BatActivationError';
  }
}

class BatActivationLimitReachedError extends BatError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.ACTIVATION_LIMIT_REACHED, message, messageStack, pvError);
    this.name = 'BatActivationLimitReachedError';
  }
}

class BatActivationThrottledError extends BatError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.ACTIVATION_THROTTLED, message, messageStack, pvError);
    this.name = 'BatActivationThrottledError';
  }
}

class BatActivationRefusedError extends BatError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.ACTIVATION_REFUSED, message, messageStack, pvError);
    this.name = 'BatActivationRefusedError';
  }
}

export {
  BatError,
  BatOutOfMemoryError,
  BatIOError,
  BatInvalidArgumentError,
  BatStopIterationError,
  BatKeyError,
  BatInvalidStateError,
  BatRuntimeError,
  BatActivationError,
  BatActivationLimitReachedError,
  BatActivationThrottledError,
  BatActivationRefusedError,
};

export function pvStatusToException(
  pvStatus: PvStatus,
  errorMessage: string,
  messageStack: string[] = [],
  pvError: PvError | null = null
): BatError {
  switch (pvStatus) {
    case PvStatus.OUT_OF_MEMORY:
      return new BatOutOfMemoryError(errorMessage, messageStack, pvError);
    case PvStatus.IO_ERROR:
      return new BatIOError(errorMessage, messageStack, pvError);
    case PvStatus.INVALID_ARGUMENT:
      return new BatInvalidArgumentError(errorMessage, messageStack, pvError);
    case PvStatus.STOP_ITERATION:
      return new BatStopIterationError(errorMessage, messageStack, pvError);
    case PvStatus.KEY_ERROR:
      return new BatKeyError(errorMessage, messageStack, pvError);
    case PvStatus.INVALID_STATE:
      return new BatInvalidStateError(errorMessage, messageStack, pvError);
    case PvStatus.RUNTIME_ERROR:
      return new BatRuntimeError(errorMessage, messageStack, pvError);
    case PvStatus.ACTIVATION_ERROR:
      return new BatActivationError(errorMessage, messageStack, pvError);
    case PvStatus.ACTIVATION_LIMIT_REACHED:
      return new BatActivationLimitReachedError(errorMessage, messageStack, pvError);
    case PvStatus.ACTIVATION_THROTTLED:
      return new BatActivationThrottledError(errorMessage, messageStack, pvError);
    case PvStatus.ACTIVATION_REFUSED:
      return new BatActivationRefusedError(errorMessage, messageStack, pvError);
    default:
      // eslint-disable-next-line no-console
      console.warn(`Unmapped error code: ${pvStatus}`);
      return new BatError(pvStatus, errorMessage);
  }
}
