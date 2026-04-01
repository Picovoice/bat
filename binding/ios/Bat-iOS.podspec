Pod::Spec.new do |s|
  s.name = 'Bat-iOS'
  s.module_name = 'Bat'
  s.version = '1.0.0'
  s.license = {:type => 'Apache 2.0'}
  s.summary = 'iOS SDK for Picovoice\'s Bat spoken language understanding engine.'
  s.description =
  <<-DESC
  Bat is an on-device streaming spoken language understanding engine.

  Bat is:
    - Private, all voice processing runs locally.
    - Accurate
    - Compact and computationally-Efficient
    - cross-platform:
      - Linux (x86_64)
      - macOS (x86_64, arm64)
      - Windows (x86_64)
      - Android
      - iOS
      - Raspberry Pi (3, 4, 5)
  DESC
  s.homepage = 'https://github.com/Picovoice/bat/tree/main/binding/ios'
  s.author = { 'Picovoice' => 'hello@picovoice.ai' }
  s.source = { :git => "https://github.com/Picovoice/bat.git", :tag => s.version.to_s }
  s.ios.deployment_target = '16.0'
  s.swift_version = '5.0'
  s.vendored_frameworks = 'lib/ios/PvBat.xcframework'
  s.resource_bundles = {
    'BatResources' => [
      'lib/common/bat_params.pv'
    ]
  }
  s.source_files = 'binding/ios/*.{swift}'
  s.exclude_files = 'binding/ios/BatAppTest/**'
end
