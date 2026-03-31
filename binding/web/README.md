# Bat Binding for Web

## Bat Spoken Language Understanding Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Bat is an on-device spoken language understanding engine. Bat is:

- Private; All voice processing runs locally.
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (3, 4, 5)

## Compatibility

- Chrome / Edge
- Firefox
- Safari

## Requirements

The Bat Web Binding uses [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer).

Include the following headers in the response to enable the use of `SharedArrayBuffers`:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Refer to our [Web demo](../../demo/web) for an example on creating a server with the corresponding response headers.

Browsers that don't support `SharedArrayBuffers` or applications that don't include the required headers will fall back to using standard `ArrayBuffers`. This will disable multithreaded processing.

### Restrictions

IndexedDB is required to use `Bat` in a worker thread. Browsers without IndexedDB support
(i.e. Firefox Incognito Mode) should use `Bat` in the main thread.

Multi-threading is only enabled for Bat when using on a web worker.

## Installation

### Package

Using `Yarn`:

```console
yarn add @picovoice/bat-web
```

or using `npm`:

```console
npm install --save @picovoice/bat-web
```

### AccessKey

Bat requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Bat SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

### Usage

Create a model in [Picovoice Console](https://console.picovoice.ai/) or use the [default model](https://github.com/Picovoice/bat/tree/master/lib/common).

For the web packages, there are two methods to initialize Bat.

#### Public Directory

**NOTE**: Due to modern browser limitations of using a file URL, this method does __not__ work if used without hosting a server.

This method fetches the model file from the public directory and feeds it to Bat. Copy the model file into the public directory:

```console
cp ${BAT_MODEL_FILE} ${PATH_TO_PUBLIC_DIRECTORY}
```

#### Base64

**NOTE**: This method works without hosting a server, but increases the size of the model file roughly by 33%.

This method uses a base64 string of the model file and feeds it to Bat. Use the built-in script `pvbase64` to
base64 your model file:

```console
npx pvbase64 -i ${BAT_MODEL_FILE} -o ${OUTPUT_DIRECTORY}/${MODEL_NAME}.js
```

The output will be a js file which you can import into any file of your project. For detailed information about `pvbase64`,
run:

```console
npx pvbase64 -h
```

#### Bat Model

Bat saves and caches your model file in IndexedDB to be used by WebAssembly. Use a different `customWritePath` variable
to hold multiple models and set the `forceWrite` value to true to force re-save a model file.

Either `base64` or `publicPath` must be set to instantiate Bat. If both are set, Bat will use the `base64` model.

```typescript
const batModel = {
  publicPath: ${MODEL_RELATIVE_PATH},
  // or
  base64: ${MODEL_BASE64_STRING},

  // Optionals
  customWritePath: "bat_model",
  forceWrite: false,
  version: 1,
}
```

#### Init options

Set a `voiceThreshold` value if you wish to change the default value.
Set `processErrorCallback` to handle errors if an error occurs while transcribing.

```typescript
// Optional, these are default
const options = {
  voiceThreshold: 0.4,
  processErrorCallback: (error) => {}
}
```

#### Initialize Bat

Create a `scoresCallback` function to get the results from the engine:

```typescript
function scoresCallback(scores: BatScores | null) {
  if (scores !== null) {
    // take action based on scores
  }
}
```

Create an instance of `Bat` on the main thread:

```typescript
const handle = await Bat.create(
  ${ACCESS_KEY},
  scoresCallback,
  batModel,
  options // optional options
);
```

Or create an instance of `Bat` in a worker thread:

```typescript
const handle = await BatWorker.create(
  ${ACCESS_KEY},
  scoresCallback,
  batModel,
  options // optional options
);
```

#### Process Audio Frames

The `process` function will send the input frames to the engine.
The scores are received from `scoresCallback` as mentioned above.

```typescript
function getAudioData(): Int16Array {
  ... // function to get audio data
  return new Int16Array();
}

for (;;) {
  handle.process(getAudioData());
  // break on some condition
}
```

#### Clean Up

Clean up used resources by `Bat` or `BatWorker`:

```typescript
await handle.release();
```

#### Terminate (Worker only)

Terminate `BatWorker` instance:

```typescript
await handle.terminate();
```

## Demo

For example usage refer to our [Web demo application](https://github.com/Picovoice/bat/tree/master/demo/web).
