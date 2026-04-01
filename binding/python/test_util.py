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

import json
import os
import struct
import wave

from typing import *


def load_test_data() -> List[Tuple[str, str, float, Dict[str, float]]]:
    data_file_path = os.path.join(os.path.dirname(__file__), "../../resources/.test/test_data.json")
    with open(data_file_path, encoding="utf8") as data_file:
        json_test_data = data_file.read()
    test_data = json.loads(json_test_data)['tests']

    language_tests = list()
    for t in test_data['language_tests']:
        for model_file in t['models']:
            language_tests.append(
                (
                    model_file,
                    t['audio_file'],
                    t['voice_threshold'],
                    t['expected_scores'],
                )
            )

    return language_tests


def read_wav_file(file_name: str, sample_rate: int) -> Tuple:
    wav_file = wave.open(file_name, mode="rb")
    channels = wav_file.getnchannels()
    num_frames = wav_file.getnframes()

    if wav_file.getframerate() != sample_rate:
        raise ValueError(
            "Audio file should have a sample rate of %d, got %d" % (sample_rate, wav_file.getframerate()))

    samples = wav_file.readframes(num_frames)
    wav_file.close()

    frames = struct.unpack('h' * num_frames * channels, samples)

    if channels == 2:
        print("Picovoice processes single-channel audio but stereo file is provided. Processing left channel only.")

    return frames[::channels]


def get_model_path(model_file: str) -> str:
    model_path_subdir = '../../lib/common/' + model_file
    return os.path.join(os.path.dirname(__file__), model_path_subdir)
