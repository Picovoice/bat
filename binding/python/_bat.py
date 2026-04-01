#
# Copyright 2026 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
from ctypes import *
from enum import Enum
from typing import *


class BatError(Exception):
    def __init__(self, message: str = '', message_stack: Optional[Sequence[str]] = None):
        super().__init__(message)

        self._message = message
        self._message_stack = list() if message_stack is None else message_stack

    def __str__(self):
        message = self._message
        if len(self._message_stack) > 0:
            message += ':'
            for i in range(len(self._message_stack)):
                message += '\n  [%d] %s' % (i, self._message_stack[i])
        return message

    @property
    def message(self) -> str:
        return self._message

    @property
    def message_stack(self) -> Sequence[str]:
        return self._message_stack


class BatMemoryError(BatError):
    pass


class BatIOError(BatError):
    pass


class BatInvalidArgumentError(BatError):
    pass


class BatStopIterationError(BatError):
    pass


class BatKeyError(BatError):
    pass


class BatInvalidStateError(BatError):
    pass


class BatRuntimeError(BatError):
    pass


class BatActivationError(BatError):
    pass


class BatActivationLimitError(BatError):
    pass


class BatActivationThrottledError(BatError):
    pass


class BatActivationRefusedError(BatError):
    pass


class Bat(object):
    """Python binding for Bat spoken language understanding engine."""

    class PicovoiceStatuses(Enum):
        SUCCESS = 0
        OUT_OF_MEMORY = 1
        IO_ERROR = 2
        INVALID_ARGUMENT = 3
        STOP_ITERATION = 4
        KEY_ERROR = 5
        INVALID_STATE = 6
        RUNTIME_ERROR = 7
        ACTIVATION_ERROR = 8
        ACTIVATION_LIMIT_REACHED = 9
        ACTIVATION_THROTTLED = 10
        ACTIVATION_REFUSED = 11

    _PICOVOICE_STATUS_TO_EXCEPTION = {
        PicovoiceStatuses.OUT_OF_MEMORY: BatMemoryError,
        PicovoiceStatuses.IO_ERROR: BatIOError,
        PicovoiceStatuses.INVALID_ARGUMENT: BatInvalidArgumentError,
        PicovoiceStatuses.STOP_ITERATION: BatStopIterationError,
        PicovoiceStatuses.KEY_ERROR: BatKeyError,
        PicovoiceStatuses.INVALID_STATE: BatInvalidStateError,
        PicovoiceStatuses.RUNTIME_ERROR: BatRuntimeError,
        PicovoiceStatuses.ACTIVATION_ERROR: BatActivationError,
        PicovoiceStatuses.ACTIVATION_LIMIT_REACHED: BatActivationLimitError,
        PicovoiceStatuses.ACTIVATION_THROTTLED: BatActivationThrottledError,
        PicovoiceStatuses.ACTIVATION_REFUSED: BatActivationRefusedError
    }

    class BatLanguages(Enum):
        UNKNOWN = 0
        DE = 1
        EN = 2
        ES = 3
        FR = 4
        IT = 5
        JA = 6
        KO = 7
        PT = 8

        @staticmethod
        def num() -> int:
            return 9

        @classmethod
        def from_str(cls, str: str) -> str:
            return {
                "unknown": cls.UNKNOWN,
                "de": cls.DE,
                "en": cls.EN,
                "es": cls.ES,
                "fr": cls.FR,
                "it": cls.IT,
                "ja": cls.JA,
                "ko": cls.KO,
                "pt": cls.PT,
            }[str]

        def __str__(self) -> str:
            return {
                self.UNKNOWN: "unknown",
                self.DE: "de",
                self.EN: "en",
                self.ES: "es",
                self.FR: "fr",
                self.IT: "it",
                self.JA: "ja",
                self.KO: "ko",
                self.PT: "pt",
            }[self]

    class CBat(Structure):
        pass

    def __init__(
            self,
            access_key: str,
            model_path: str,
            device: str,
            voice_threshold: float,
            library_path: str):
        """
        Constructor

        :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
        :param model_path: Absolute path to the file containing model parameters.
        :param device: String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
        suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU device.
        To select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index
        of the target GPU. If set to `cpu`, the engine will run on the CPU with the default number of threads.
        To specify the number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}`
        is the desired number of threads.
        :param voice_threshold: Sensitivity threshold for detecting voice. The value should be a number within [0, 1].
        A higher threshold increases detection confidence at the cost of potentially missing frames of voice.
        :param library_path: Absolute path to Bat's dynamic library.
        """

        if not isinstance(access_key, str) or len(access_key) == 0:
            raise BatInvalidArgumentError("`access_key` should be a non-empty string.")

        if not os.path.exists(library_path):
            raise BatIOError("Could not find Bat's dynamic library at `%s`." % library_path)

        if not os.path.exists(model_path):
            raise BatIOError("Could not find model file at `%s`." % model_path)

        if not isinstance(device, str) or len(device) == 0:
            raise BatInvalidArgumentError("`device` should be a non-empty string.")

        if not 0 <= voice_threshold <= 1:
            raise ValueError("voice_threshold should be within [0, 1].")

        library = cdll.LoadLibrary(library_path)

        set_sdk_func = library.pv_set_sdk
        set_sdk_func.argtypes = [c_char_p]
        set_sdk_func.restype = None

        set_sdk_func('python'.encode('utf-8'))

        self._get_error_stack_func = library.pv_get_error_stack
        self._get_error_stack_func.argtypes = [POINTER(POINTER(c_char_p)), POINTER(c_int)]
        self._get_error_stack_func.restype = self.PicovoiceStatuses

        self._free_error_stack_func = library.pv_free_error_stack
        self._free_error_stack_func.argtypes = [POINTER(c_char_p)]
        self._free_error_stack_func.restype = None

        init_func = library.pv_bat_init
        init_func.argtypes = [
            c_char_p,
            c_char_p,
            c_char_p,
            c_float,
            POINTER(POINTER(self.CBat)),
        ]
        init_func.restype = self.PicovoiceStatuses

        self._handle = POINTER(self.CBat)()

        status = init_func(
            access_key.encode(),
            model_path.encode(),
            device.encode(),
            voice_threshold,
            byref(self._handle))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Initialization failed',
                message_stack=self._get_error_stack())

        self._delete_func = library.pv_bat_delete
        self._delete_func.argtypes = [POINTER(self.CBat)]
        self._delete_func.restype = None

        self._process_func = library.pv_bat_process
        self._process_func.argtypes = [POINTER(self.CBat), POINTER(c_short), POINTER(POINTER(c_float))]
        self._process_func.restype = self.PicovoiceStatuses

        self._scores_delete_func = library.pv_bat_scores_delete
        self._scores_delete_func.argtypes = [POINTER(c_float)]
        self._scores_delete_func.restype = None

        version_func = library.pv_bat_version
        version_func.argtypes = []
        version_func.restype = c_char_p
        self._version = version_func().decode('utf-8')

        self._sample_rate = library.pv_sample_rate()

        self._frame_length = library.pv_bat_frame_length()

    def process(self, pcm: Sequence[int]) -> Optional[Dict[BatLanguages, float]]:
        """
        Processes a frame of audio and returns detection scores for each supported language.

        :param pcm: A frame of audio samples. The number of samples per frame can be attained by calling
        `.frame_length`. The incoming audio needs to have a sample rate equal to `.sample_rate` and be 16-bit
        linearly-encoded. Furthermore, Bat operates on single-channel audio.

        :return: Dictionary of language to detection score. The scores are in the range [0, 1] with 1 being
        maximum confidence in a perfect match. If `None` is returned, Bat did not detect usable voice in the frame.
        """

        if len(pcm) != self.frame_length:
            raise BatInvalidArgumentError(
                f"The length of the pcm audio frame ({len(pcm)}) does "
                f"not match the required frame length ({self.frame_length})")

        c_scores = POINTER(c_float)()
        status = self._process_func(
            self._handle,
            (c_short * len(pcm))(*pcm),
            byref(c_scores))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Process failed',
                message_stack=self._get_error_stack())

        if c_scores:
            scores = dict()
            for x in range(self.BatLanguages.num()):
                scores[self.BatLanguages(x)] = c_scores[x]
            self._scores_delete_func(c_scores)
            return scores

        return None

    def delete(self) -> None:
        """Releases resources acquired by Bat."""

        self._delete_func(self._handle)

    @property
    def version(self) -> str:
        """Version."""

        return self._version

    @property
    def sample_rate(self) -> int:
        """Audio sample rate accepted by `.process()`."""

        return self._sample_rate

    @property
    def frame_length(self) -> int:
        """Number of audio samples per frame expected by C library."""

        return self._frame_length

    def _get_error_stack(self) -> Sequence[str]:
        message_stack_ref = POINTER(c_char_p)()
        message_stack_depth = c_int()
        status = self._get_error_stack_func(byref(message_stack_ref), byref(message_stack_depth))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](message='Unable to get Bat error state')

        message_stack = list()
        for i in range(message_stack_depth.value):
            message_stack.append(message_stack_ref[i].decode('utf-8'))

        self._free_error_stack_func(message_stack_ref)

        return message_stack


def list_hardware_devices(library_path: str) -> Sequence[str]:
    dll_dir_obj = None
    if hasattr(os, "add_dll_directory"):
        dll_dir_obj = os.add_dll_directory(os.path.dirname(library_path))

    library = cdll.LoadLibrary(library_path)

    if dll_dir_obj is not None:
        dll_dir_obj.close()

    list_hardware_devices_func = library.pv_bat_list_hardware_devices
    list_hardware_devices_func.argtypes = [POINTER(POINTER(c_char_p)), POINTER(c_int32)]
    list_hardware_devices_func.restype = Bat.PicovoiceStatuses
    c_hardware_devices = POINTER(c_char_p)()
    c_num_hardware_devices = c_int32()
    status = list_hardware_devices_func(byref(c_hardware_devices), byref(c_num_hardware_devices))
    if status is not Bat.PicovoiceStatuses.SUCCESS:
        raise Bat._PICOVOICE_STATUS_TO_EXCEPTION[status](
            message='`pv_bat_list_hardware_devices` failed.')
    res = [c_hardware_devices[i].decode() for i in range(c_num_hardware_devices.value)]

    free_hardware_devices_func = library.pv_bat_free_hardware_devices
    free_hardware_devices_func.argtypes = [POINTER(c_char_p), c_int32]
    free_hardware_devices_func.restype = None
    free_hardware_devices_func(c_hardware_devices, c_num_hardware_devices.value)

    return res


__all__ = [
    'Bat',
    'BatActivationError',
    'BatActivationLimitError',
    'BatActivationRefusedError',
    'BatActivationThrottledError',
    'BatError',
    'BatIOError',
    'BatInvalidArgumentError',
    'BatInvalidStateError',
    'BatKeyError',
    'BatMemoryError',
    'BatRuntimeError',
    'BatStopIterationError',
    'list_hardware_devices',
]
