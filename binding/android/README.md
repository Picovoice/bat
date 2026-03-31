# Bat Binding for Android

## Bat Spoken Language Understanding Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Bat is an on-device speech-to-text engine. Bat is:

- Private; All voice processing runs locally.
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (3, 4, 5)

## Compatibility

- Android 5.0 (SDK 21+)

## Installation

Bat is hosted on Maven Central. To include the package in your Android project, ensure you have
included `mavenCentral()` in your top-level `build.gradle` file and then add the following to your
app's `build.gradle`:

```groovy
dependencies {
    // ...
    implementation 'ai.picovoice:bat-android:${VERSION}'
}
```

## AccessKey

Bat requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Bat SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Create an instance of the engine with the Bat Builder class by passing in the `accessKey` and Android app context:

```java
import ai.picovoice.bat.*;

final String accessKey = "${ACCESS_KEY}"; // AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
try {
    Bat bat = new Bat.Builder()
        .setAccessKey(accessKey)
        .build(appContext);
} catch (BatException ex) { }
```

Process audio:

```java
short[] getNextAudioFrame() {
    // .. get audioFrame
    return audioFrame;
}

while (true) {
    HashMap<BatLanguages, Float> languageScores = bat.process(getNextAudioFrame());
    if (languageScores != null) {
        // take action based on languageScores
    }
}
```

When done, resources have to be released explicitly:

```java
bat.delete();
```

## Demo App

For example usage refer to our [Android demo application](../../demo/android).
