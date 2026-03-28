#
#    Copyright 2026 Picovoice Inc.
#
#    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
#    file accompanying this source.
#
#    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
#    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
#    specific language governing permissions and limitations under the License.
#

import argparse
import sys

import pvbat
from pvbat import BatActivationLimitError, create
from pvrecorder import PvRecorder


FIRST_PRINT = True


def print_scores_bar(language, score):
    percentage = score * 100
    bar_length = int((percentage / 10) * 3)
    empty_length = 30 - bar_length
    sys.stdout.write("%-8s: [%.2f]|%s%s|\n" % (language, score, '█' * bar_length, ' ' * empty_length))


def print_scores(scores):
    global FIRST_PRINT
    if not FIRST_PRINT:
        num_lines = len(pvbat.Bat.BatLanguages) + 2
        for _ in range(num_lines):
            sys.stdout.write("\x1b[1A\x1b[2K")

    for l in pvbat.Bat.BatLanguages:
        print_scores_bar(l, scores[l] if scores else 0.0)
    if (scores):
        sys.stdout.write("\n")
    else:
        sys.stdout.write("(no voice detected)\n")
    sys.stdout.flush()

    FIRST_PRINT = False


def print_loading_bar(progress):
    percentage = progress * 100
    bar_length = int((percentage / 10) * 4.6)
    empty_length = 46 - bar_length

    sys.stdout.write("\r[%s%s]" % ('.' * bar_length, ' ' * empty_length))
    sys.stdout.flush()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--access_key',
        help='AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)')
    parser.add_argument(
        '--library_path',
        help='Absolute path to dynamic library. Default: using the library provided by `pvbat`')
    parser.add_argument(
        '--model_path',
        help='Absolute path to Bat model. Default: using the model provided by `pvbat`')
    parser.add_argument(
        '--device',
        help='Device to run inference on (`best`, `cpu:{num_threads}` or `gpu:{gpu_index}`). '
             'Default: automatically selects best device')
    parser.add_argument(
        '--voice_threshold',
        help="Sensitivity threshold for detecting voice. The value should be a number within [0, 1]. "
             "A higher threshold increases detection confidence at the cost of potentially missing frames of voice. "
             "If not set 0.4 will be used.",
        type=float,
        default=0.4)
    parser.add_argument(
        '--update_duration',
        help="Step size for calling Bat process in seconds. Value should be between 0.5 and 2.0 seconds.",
        type=float,
        default=0.75)
    parser.add_argument('--audio_device_index', type=int, default=-1, help='Index of input audio device')
    parser.add_argument('--show_audio_devices', action='store_true', help='Only list available devices and exit')
    parser.add_argument(
        '--show_inference_devices',
        action='store_true',
        help='Print devices that are available to run Bat inference')

    args = parser.parse_args()

    if args.show_inference_devices:
        print('\n'.join(pvbat.available_devices(library_path=args.library_path)))
        return

    if args.show_audio_devices:
        for index, name in enumerate(PvRecorder.get_available_devices()):
            print('Device #%d: %s' % (index, name))
        return

    if not args.access_key:
        print('--access_key is required.')
        return

    if not 0.5 <= args.update_duration <= 2.0:
        raise ValueError(f"update_duration should be between 0.5 and 2.0 seconds.")

    bat = create(
        access_key=args.access_key,
        library_path=args.library_path,
        model_path=args.model_path,
        device=args.device,
        voice_threshold=args.voice_threshold)

    try:
        print('Bat version : %s' % bat.version)

        update_duration_samples = int(args.update_duration * bat.sample_rate)

        recorder_frame_length = 512
        if bat.frame_length % recorder_frame_length != 0:
            print(f'bat.frame_length `{bat.frame_length}` is not a multiple ' +\
                f'of recorder_frame_length `{recorder_frame_length}`')
            return

        recorder = PvRecorder(frame_length=recorder_frame_length, device_index=args.audio_device_index)
        recorder.start()
        print('Listening... (press Ctrl+C to stop)')
        print_scores(None)

        try:
            buffer = list()
            while True:
                buffer.extend(recorder.read())
                print_loading_bar(len(buffer) / bat.frame_length)
                if len(buffer) >= bat.frame_length:
                    sys.stdout.write("\n")
                    scores = bat.process(buffer[:bat.frame_length])
                    print_scores(scores)
                    buffer = buffer[update_duration_samples:]

        finally:
            print()
            recorder.stop()

    except KeyboardInterrupt:
        pass
    except BatActivationLimitError:
        print('AccessKey has reached its processing limit.')
    finally:
        bat.delete()


if __name__ == '__main__':
    main()
