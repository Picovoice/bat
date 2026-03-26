# Bat

[![GitHub release](https://img.shields.io/github/release/Picovoice/Bat.svg)](https://github.com/Picovoice/Bat/releases)
[![GitHub](https://img.shields.io/github/license/Picovoice/bat)](https://github.com/Picovoice/bat/)

[![Maven Central](https://img.shields.io/maven-central/v/ai.picovoice/bat-android?label=maven-central%20%5Bandroid%5D)](https://repo1.maven.org/maven2/ai/picovoice/bat-android/)
[![npm](https://img.shields.io/npm/v/@picovoice/bat-web?label=npm%20%5Bweb%5D)](https://www.npmjs.com/package/@picovoice/bat-web)<!-- markdown-link-check-disable-line -->
[![CocoaPods](https://img.shields.io/cocoapods/v/Bat-iOS)](https://cocoapods.org/pods/Bat-iOS)<!-- markdown-link-check-disable-line -->
[![PyPI](https://img.shields.io/pypi/v/pvbat)](https://pypi.org/project/pvbat/)

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

[![Twitter URL](https://img.shields.io/twitter/url?label=%40AiPicovoice&style=social&url=https%3A%2F%2Ftwitter.com%2FAiPicovoice)](https://twitter.com/AiPicovoice)<!-- markdown-link-check-disable-line -->
[![YouTube Channel Views](https://img.shields.io/youtube/channel/views/UCAdi9sTCXLosG1XeqDwLx7w?label=YouTube&style=social)](https://www.youtube.com/channel/UCAdi9sTCXLosG1XeqDwLx7w)

Bat is an on-device streaming speech-to-text engine. Bat is:

- Private; All voice processing runs locally.
- [Accurate](https://picovoice.ai/docs/benchmark/stt/)
- [Compact and Computationally-Efficient](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64, arm64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (3, 4, 5)

## Table of Contents

- [Bat](#bat)
    - [Table of Contents](#table-of-contents)
    - [AccessKey](#accesskey)
    - [Language Support](#language-support)
    - [Demos](#demos)
        - [Python](#python-demos)
        - [C](#c-demos)
        - [iOS](#ios-demos)
        - [Android](#android-demo)
        - [Web](#web-demos)
          - [Vanilla JavaScript and HTML](#vanilla-javascript-and-html)
    - [SDKs](#sdks)
        - [Python](#python)
        - [C](#c)
        - [iOS](#ios)
        - [Android](#android)
        - [Web](#web)
          - [Vanilla JavaScript and HTML (ES Modules)](#vanilla-javascript-and-html-es-modules)
    - [Releases](#releases)

## AccessKey

AccessKey is your authentication and authorization token for deploying Picovoice SDKs, including Bat. Anyone who is
using Picovoice needs to have a valid AccessKey. You must keep your AccessKey secret. You would need internet
connectivity to validate your AccessKey with Picovoice license servers even though the voice recognition is running 100%
offline.

AccessKey also verifies that your usage is within the limits of your account. You can see your usage limits and real-time usage on your [Picovoice Console Profile](https://console.picovoice.ai/profile). To continue using Picovoice after your trial or renew and adjust your usage limits, please reach out to our [Enterprise Sales Team](https://picovoice.ai/contact) or your existing Picovoice contact.

## Language Support

- Bat Streaming Speech-to-Text currently supports English, French, German, Italian, Portuguese, and Spanish.
- Support for [additional languages is available for commercial customers](https://picovoice.ai/consulting/) on a case-by-case basis.

## Demos

### Python Demos

Install the demo package:

```console
pip3 install pvbatdemo
```

```console
bat_demo_mic --access_key ${ACCESS_KEY}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console.

### C Demos

If using SSH, clone the repository with:

```console
git clone --recurse-submodules git@github.com:Picovoice/bat.git
```

If using HTTPS, clone the repository with:

```console
git clone --recurse-submodules https://github.com/Picovoice/bat.git
```

Build the demo:

```console
cmake -S demo/c/ -B demo/c/build && cmake --build demo/c/build
```

Run the demo:

```console
./demo/c/build/bat_demo_mic -a ${ACCESS_KEY} -m ${MODEL_PATH} -l ${LIBRARY_PATH}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console, `${LIBRARY_PATH}` with the path to appropriate
library under [lib](/lib), and `${MODEL_PATH}` to path to [default model file](./lib/common/bat_params.pv)
(or your custom one).

### iOS Demos

To run the demo, go to [demo/ios/BatDemo](./demo/ios/BatDemo) and run:

```console
pod install
```

Replace `let accessKey = "${YOUR_ACCESS_KEY_HERE}"` in the file [ViewModel.swift](./demo/ios/BatDemo/BatDemo/ViewModel.swift) with your `AccessKey`.

Then, using [Xcode](https://developer.apple.com/xcode/), open the generated `BatDemo.xcworkspace` and run the application.

### Android Demo

Using Android Studio, open [demo/android/BatDemo](./demo/android/BatDemo) as an Android project and then run the application.

Replace `"${YOUR_ACCESS_KEY_HERE}"` in the file [MainActivity.java](./demo/android/BatDemo/bat-demo-app/src/main/java/ai/picovoice/batdemo/MainActivity.java) with your `AccessKey`.

### Web Demos

#### Vanilla JavaScript and HTML

From [demo/web](./demo/web) run the following in the terminal:

```console
yarn
yarn start
```

(or)

```console
npm install
npm run start
```

Open `http://localhost:5000` in your browser to try the demo.

## SDKs

### Python

Install the Python SDK:

```console
pip3 install pvbat
```

Create an instance of the engine and transcribe audio in real-time:

```python
import pvbat

handle = pvbat.create(access_key='${ACCESS_KEY}')

def get_next_audio_frame():
    pass

while True:
    partial_transcript, is_endpoint = handle.process(get_next_audio_frame())
    if is_endpoint:
        final_transcript = handle.flush()
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console.

### C

Create an instance of the engine and transcribe audio in real-time:

```c
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

#include "pv_bat.h"

pv_bat_t *handle = NULL;
const pv_status_t status = pv_bat_init("${ACCESS_KEY}", "${MODEL_PATH}", "${DEVICE}", 0.f, false, false, &handle);
if (status != PV_STATUS_SUCCESS) {
    // error handling logic
}

extern const int16_t *get_next_audio_frame(void);

while (true) {
    char *partial_transcript = NULL;
    bool is_endpoint = false;
    const pv_status_t status = pv_bat_process(
            handle,
            get_next_audio_frame(),
            &partial_transcript,
            &is_endpoint);
    if (status != PV_STATUS_SUCCESS) {
        // error handling logic
    }
    // do something with transcript
    free(partial_transcript);
    if (is_endpoint) {
        char *final_transcript = NULL;
        const pv_status_t status = pv_bat_flush(handle, &final_transcript);
        if (status != PV_STATUS_SUCCESS) {
            // error handling logic
        }
        // do something with transcript
        free(final_transcript);
    }
}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${MODEL_PATH}` to path to
[default model file](./lib/common/bat_params.pv) (or your custom one). Finally, when done be sure to release
resources acquired using `pv_bat_delete(handle)`.

### iOS
<!-- markdown-link-check-disable -->
The Bat iOS binding is available via [CocoaPods](https://cocoapods.org/pods/Bat-iOS). To import it into your iOS project, add the following line to your Podfile and run `pod install`:
<!-- markdown-link-check-enable -->
```ruby
pod 'Bat-iOS'
```

Create an instance of the engine and transcribe audio in real-time:

```swift
import Bat

let modelPath = Bundle(for: type(of: self)).path(
        forResource: "${MODEL_FILE}", // Name of the model file name for Bat
        ofType: "pv")!

let bat = Bat(accessKey: "${ACCESS_KEY}", modelPath: modelPath)

func getNextAudioFrame() -> [Int16] {
  // .. get audioFrame
  return audioFrame;
}

while true {
  do {
    let partialTranscript, isEndpoint = try bat.process(getNetAudioFrame())
    if isEndpoint {
      let finalTranscript = try bat.flush()
    }
  } catch let error as BatError {
      // handle error
  } catch { }
}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${MODEL_FILE}` with a custom trained model from
[Picovoice Console](https://console.picovoice.ai/) or the [default model](./lib/common/bat_params.pv).

### Android

To include the package in your Android project, ensure you have included `mavenCentral()` in your top-level `build.gradle` file and then add the following to your app's `build.gradle`:

```groovy
dependencies {
    implementation 'ai.picovoice:bat-android:${LATEST_VERSION}'
}
```

Create an instance of the engine and transcribe audio in real-time:

```java
import ai.picovoice.bat.*;

final String accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
final String modelPath = "${MODEL_FILE}";

short[] getNextAudioFrame() {
    // .. get audioFrame
    return audioFrame;
}

try {
    Bat bat = new Bat.Builder().setAccessKey(accessKey).setModelPath(modelPath).build(appContext);

    String transcript = "";

    while true {
        BatTranscript transcriptObj = bat.process(getNextAudioFrame());
        transcript += transcriptObj.getTranscript();

        if (transcriptObj.getIsEndpoint()) {
            BatTranscript finalTranscriptObj = bat.flush();
            transcript += finalTranscriptObj.getTranscript();
        }
    };

} catch (BatException ex) { }
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${MODEL_FILE}` with the default or custom trained model from [console](https://console.picovoice.ai/).

### Web

#### Vanilla JavaScript and HTML (ES Modules)

Install the web SDK using yarn:

```console
yarn add @picovoice/bat-web
```

or using npm:

```console
npm install --save @picovoice/bat-web
```

Create an instance of the engine using `BatWorker` and transcribe an audio file:

```typescript
import { BatWorker } from "@picovoice/bat-web";
import batParams from "${PATH_TO_BASE64_BAT_PARAMS}";

let transcript = "";

function transcriptCallback(batTranscript: BatTranscript) {
  transcript += batTranscript.transcript;
  if (batTranscript.isEndpoint) {
    transcript += "\n";
  }
}

function getAudioData(): Int16Array {
  // ... function to get audio data
  return new Int16Array();
}

const bat = await BatWorker.create(
  "${ACCESS_KEY}",
  transcriptCallback,
  { base64: batParams }
);

for (;;) {
  bat.process(getAudioData());
  // break on some condition
}
bat.flush(); // runs transcriptionCallback on remaining data.
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/). Finally, when done release the resources using `bat.release()`.

## Releases

### v1.0.0 - March 25th, 2026

* Initial release
