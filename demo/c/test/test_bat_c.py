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

import os.path
import subprocess
import sys
import unittest

from parameterized import parameterized

from test_util import *

language_tests = load_test_data()


class BatCTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls._access_key = sys.argv[1]
        cls._device = sys.argv[2]
        cls._platform = sys.argv[3]
        cls._arch = "" if len(sys.argv) != 5 else sys.argv[4]
        cls._root_dir = os.path.join(os.path.dirname(__file__), "../../..")

    def _get_library_file(self):
        if self._platform == "windows":
            if self._arch == "amd64":
                os.environ["PATH"] += os.pathsep + os.path.join(self._root_dir, "lib", "windows", "amd64")

        return os.path.join(
            self._root_dir,
            "lib",
            self._platform,
            self._arch,
            "libpv_bat." + get_lib_ext(self._platform)
        )

    def _get_model_path_by_model_name(self, model_name):
        return os.path.join(self._root_dir, "lib/common/", model_name)

    @parameterized.expand(language_tests)
    def test_bat(
            self,
            model_file: str,
            audio_file: str,
            voice_threshold: float,
            expected_scores: Dict[str, float]):
        args = [
            os.path.join(os.path.dirname(__file__), "../build/bat_demo_file"),
            "-a", self._access_key,
            "-l", self._get_library_file(),
            "-y", self._device,
            "-m", self._get_model_path_by_model_name(model_file),
            "-v", f"{voice_threshold}"
        ]
        args.append(os.path.join(self._root_dir, 'resources/', "audio_samples/", audio_file))

        process = subprocess.Popen(args, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        stdout, stderr = process.communicate()
        self.assertEqual(process.poll(), 0)
        self.assertEqual(stderr.decode('utf-8'), '')

        c_scores = list()
        scores_lines = stdout.decode('utf-8').strip().split('\n')[4:-2]
        for scores in scores_lines:
            cleaned = scores.split("sec: ")[1].strip("[]").strip().strip(",")
            c_scores.append([float(x.split(": ")[1]) for x in cleaned.split(", ")])
        test_scores = c_scores[0]
        for x in range(1, len(c_scores)):
            for y in range(len(c_scores[x])):
                test_scores[y] += c_scores[x][y]
        for x in range(len(test_scores)):
            test_scores[x] = test_scores[x] / len(c_scores)

        for i, expected_score in enumerate(expected_scores.values()):
            self.assertAlmostEqual(
                test_scores[i],
                expected_score,
                delta=0.01)


if __name__ == '__main__':
    if len(sys.argv) < 4 or len(sys.argv) > 5:
        print("usage: test_bat_c.py ${AccessKey} ${Device} ${Platform} [${Arch}]")
        exit(1)
    unittest.main(argv=sys.argv[:1])
