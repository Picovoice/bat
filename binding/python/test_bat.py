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
import sys
import unittest

from collections import defaultdict

from parameterized import parameterized

from _bat import (
    Bat,
    BatError,
    list_hardware_devices
)
from _util import *
from test_util import *


language_tests = load_test_data()


class BatTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._access_key = sys.argv[1]
        cls._device = sys.argv[2]
        cls._audio_directory = os.path.join('..', '..', 'resources', 'audio_samples')

    @classmethod
    def _create_bat(
            cls,
            model_file: str,
            voice_threshold: float) -> Bat:
        return Bat(
            access_key=cls._access_key,
            model_path=get_model_path(model_file=model_file),
            device=cls._device,
            library_path=default_library_path('../..'),
            voice_threshold=voice_threshold)

    @parameterized.expand(language_tests)
    def test_process(
            self,
            model_file: str,
            audio_file: str,
            voice_threshold: float,
            expected_scores: Dict[str, float]):
        o = None

        try:
            o = self._create_bat(
                model_file=model_file,
                voice_threshold=voice_threshold)

            pcm = read_wav_file(
                file_name=os.path.join(self._audio_directory, audio_file),
                sample_rate=o.sample_rate)

            scores = defaultdict(lambda: 0.0)
            num_frames = len(pcm) // o.frame_length
            for i in range(num_frames):
                frame = pcm[i * o.frame_length:(i + 1) * o.frame_length]
                partial_scores = o.process(frame)
                if partial_scores:
                    for k, v in partial_scores.items():
                        scores[k] += v
            for k in scores.keys():
                scores[k] = scores[k] / num_frames

            for language_str, expected_score in expected_scores.items():
                language = Bat.BatLanguages.from_str(language_str)
                self.assertAlmostEqual(
                    scores[language],
                    expected_score,
                    delta=0.01)
        finally:
            if o is not None:
                o.delete()

    def test_version(self):
        o = Bat(
            access_key=self._access_key,
            model_path=default_model_path('../..'),
            device=self._device,
            library_path=default_library_path('../..'),
            voice_threshold=0.4)
        self.assertIsInstance(o.version, str)
        self.assertGreater(len(o.version), 0)

    def test_message_stack(self):
        relative = '../../'

        error = None
        try:
            c = Bat(
                access_key='invalid',
                library_path=default_library_path(relative),
                device=self._device,
                model_path=default_model_path(relative),
                voice_threshold=0.4)
            self.assertIsNone(c)
        except BatError as e:
            error = e.message_stack

        self.assertIsNotNone(error)
        self.assertGreater(len(error), 0)

        try:
            c = Bat(
                access_key='invalid',
                library_path=default_library_path(relative),
                device=self._device,
                model_path=default_model_path(relative),
                voice_threshold=0.4)
            self.assertIsNone(c)
        except BatError as e:
            self.assertEqual(len(error), len(e.message_stack))
            self.assertListEqual(list(error), list(e.message_stack))

    def test_process_message_stack(self):
        relative = '../../'

        c = Bat(
            access_key=sys.argv[1],
            library_path=default_library_path(relative),
            device=self._device,
            model_path=default_model_path(relative),
            voice_threshold=0.4)
        test_pcm = [0] * c._frame_length

        address = c._handle
        c._handle = None

        try:
            res = c.process(test_pcm)
            self.assertIsNone(res)
        except BatError as e:
            self.assertGreater(len(e.message_stack), 0)
            self.assertLess(len(e.message_stack), 8)

        c._handle = address

    def test_available_devices(self) -> None:
        res = list_hardware_devices(library_path=default_library_path("../.."))
        self.assertGreater(len(res), 0)
        for x in res:
            self.assertIsInstance(x, str)
            self.assertGreater(len(x), 0)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("usage: %s ${ACCESS_KEY} ${DEVICE}" % sys.argv[0])
        exit(1)

    unittest.main(argv=sys.argv[:1])
