# Bat Binding for iOS

## Bat Spoken Language Understanding Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Bat is an on-device spoken language understanding engine. Bat is:

- Private, All voice processing runs locally.
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64)
  - Android and iOS
  - Chrome, Safari, Firefox, and Edge
  - Raspberry Pi (3, 4, 5)

## Compatibility

- iOS 16.0+

## Installation

<!-- markdown-link-check-disable -->
The Bat iOS binding is available via [Swift Package Manager](https://www.swift.org/documentation/package-manager/) or [CocoaPods](https://cocoapods.org/pods/Bat-iOS).
<!-- markdown-link-check-enable -->

To import the package using SPM, open up your project's Package Dependencies in XCode and add:
```
https://github.com/Picovoice/bat.git
```
To import it into your iOS project using CocoaPods, add the following line to your Podfile:

```ruby
pod 'Bat-iOS'
```

## AccessKey

Bat requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Bat SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Create an instance of the engine:

```swift
import Bat

let accessKey = "${ACCESS_KEY}" // AccessKey obtained from https://console.picovoice.ai/access_key

let bat = Bat(accessKey: accessKey)
```

Process audio:

```swift
func getNextAudioFrame() -> [Int16] {
  // .. get audioFrame
  return audioFrame;
}

while true {
  do {
    let languageScores = try bat.process(getNextAudioFrame())
    if languageScores != nil {
      // do something with languageScores
    }
  } catch let error as BatError {
      // handle error
  } catch { }
}

```


Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/).
Finally, when done be sure to explicitly release the resources using `bat.delete()`.

## Running Unit Tests

Copy your `AccessKey` into the `accessKey` variable in [`BatAppTestUITests.swift`](BatAppTest/BatAppTestUITests/BatAppTestUITests.swift). Open [`BatAppTest.xcodeproj`](BatAppTest/BatAppTest.xcodeproj) with XCode and run the tests with `Product > Test`.

## Demo App

For example usage refer to our [iOS demo application](../../demo/ios).
