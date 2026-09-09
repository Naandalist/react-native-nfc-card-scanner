# NFC Card Scanner example

Bare React Native app that exercises `react-native-nfc-card-scanner`.

**Use a physical Android phone with NFC.** Emulators and iOS Simulator cannot tap a card. iPhone hardware is also a poor demo target: Core NFC blocks payment AIDs.

## Setup

```bash
# from repo root
yarn build

cd example
npm install
```

### Android

`AndroidManifest.xml` already includes the NFC permission.

```bash
npx react-native run-android
```

Hold the card against the back of the device after tapping **Scan Card**.

### iOS (optional / experimental)

1. `cd ios && bundle exec pod install && cd ..`
2. In Xcode, add the **Near Field Communication Tag Reading** capability to the target (this wires `NfcCardScannerExample.entitlements`).
3. Run on a physical iPhone.

Do not expect a bank card PAN to come back on iOS.

## Library path

The example depends on the parent package via `"react-native-nfc-card-scanner": "file:.."` and on the peer `"react-native-nfc-manager"`.
