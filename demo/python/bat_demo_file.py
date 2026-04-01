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
import struct
import wave

import pvbat
from pvbat import BatActivationLimitError, create


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
        '--wav_paths',
        nargs='+',
        metavar='PATH',
        help='Absolute paths to `.wav` files to be processed')
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
        '--show_inference_devices',
        action='store_true',
        help='Print devices that are available to run Bat inference')

    args = parser.parse_args()

    if args.show_inference_devices:
        print('\n'.join(pvbat.available_devices(library_path=args.library_path)))
        return

    if args.access_key is None or args.wav_paths is None:
        raise ValueError("Arguments --access_key and --wav_paths are required.")

    bat = create(
        access_key=args.access_key,
        model_path=args.model_path,
        device=args.device,
        library_path=args.library_path,
        voice_threshold=args.voice_threshold)

    try:
        for wav_path in args.wav_paths:
            with wave.open(wav_path, 'rb') as f:
                if f.getframerate() != bat.sample_rate:
                    raise ValueError(
                        "invalid sample rate of `%d`. bat only accepts `%d`" % (f.getframerate(), bat.sample_rate))
                if f.getnchannels() != 1:
                    raise ValueError("this demo can only process single-channel WAV files")
                if f.getsampwidth() != 2:
                    raise ValueError("this demo can only process 16-bit WAV files")

                buffer = f.readframes(f.getnframes())
                audio = struct.unpack('%dh' % (len(buffer) / struct.calcsize('h')), buffer)

            print(wav_path)

            num_frames = len(audio) // bat.frame_length
            for i in range(num_frames):
                frame = audio[i * bat.frame_length:(i + 1) * bat.frame_length]
                scores = bat.process(frame)

                start_timestamp = float(i * bat.frame_length) / float(bat.sample_rate)
                end_timestamp = float((i + 1) * bat.frame_length) / float(bat.sample_rate)
                if scores:
                    print(
                        f"{start_timestamp:0.1f} -> {end_timestamp:0.1f} sec:",
                        [f"{k}: {v:.2f}" for k, v in scores.items()])
                else:
                    print(
                        f"{start_timestamp:0.1f} -> {end_timestamp:0.1f} sec:",
                        "(no voice detected)")

            print("")

    except BatActivationLimitError:
        print('AccessKey has reached its processing limit.')
    finally:
        bat.delete()


if __name__ == '__main__':
    main()
