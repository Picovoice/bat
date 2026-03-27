# Bat Binding for Python

## Bat Spoken Language Understanding Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Bat is an on-device spoken language understanding engine. Bat is:

- Private; All voice processing runs locally.
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64, arm64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (3, 4, 5)

## Compatibility

- Python 3.9+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64, arm64), and Raspberry Pi (3, 4, 5).

## Installation

```console
pip3 install pvbat
```

## AccessKey

Bat requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Bat SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Create an instance of the engine and detect the spoken language from an audio stream.

```python
import pvbat

handle = pvbat.create(access_key='${ACCESS_KEY}')

def get_next_audio_frame():
    pass

while True:
    language_scores = handle.process(get_next_audio_frame())
    if language_scores:
        print(language_scores)
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/). When done be sure
to explicitly release the resources using `handle.delete()`.

## Demos

[pvbatdemo](https://pypi.org/project/pvbatdemo/) provides command-line utilities for processing audio using
Bat.
