# Contributing

1. Fork and branch from `main`.
2. Keep changes focused. The tracking issue for reliability work is [#1](https://github.com/Naandalist/react-native-nfc-card-scanner/issues/1).
3. Run `yarn test`, `yarn typecheck`, and `yarn build` before opening a PR.
4. Do not log or commit raw PAN values from live cards. Use fixtures.

## Scripts

```bash
yarn test
yarn typecheck
yarn build
```

The example app lives in `example/` and needs a physical Android device with NFC.
