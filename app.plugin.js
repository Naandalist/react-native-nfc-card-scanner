const {
  withAndroidManifest,
  withInfoPlist,
  withEntitlementsPlist,
  AndroidConfig,
} = require('@expo/config-plugins');

/** AIDs this library SELECTs. Payment AIDs still do not work on iOS Core NFC. */
const DEFAULT_SELECT_IDENTIFIERS = [
  '325041592E5359532E4444463031', // PPSE
  'A0000000031010', // Visa
  'A0000000041010', // Mastercard
  'A000000025010701', // Amex
  'A0000000651010', // JCB
  'A000000333010101', // UnionPay
  'A0000001523010', // Discover
];

const DEFAULT_NFC_PERMISSION =
  'This app uses NFC to read payment card information';

function addAndroidNfc(androidManifest) {
  const manifest = androidManifest.manifest;
  if (!manifest.$) {
    manifest.$ = {};
  }

  AndroidConfig.Permissions.addPermission(
    androidManifest,
    'android.permission.NFC',
  );

  const usesFeature = manifest['uses-feature'] ?? [];
  const hasNfcFeature = usesFeature.some(
    (item) => item.$?.['android:name'] === 'android.hardware.nfc',
  );
  if (!hasNfcFeature) {
    usesFeature.push({
      $: {
        'android:name': 'android.hardware.nfc',
        'android:required': 'false',
      },
    });
    manifest['uses-feature'] = usesFeature;
  }

  return androidManifest;
}

function withAndroidNfc(config) {
  return withAndroidManifest(config, (mod) => {
    mod.modResults = addAndroidNfc(mod.modResults);
    return mod;
  });
}

function withIosNfc(config, props = {}) {
  const permission = props.nfcPermission;
  const extraIds = props.selectIdentifiers ?? [];

  config = withInfoPlist(config, (mod) => {
    if (permission !== false) {
      mod.modResults.NFCReaderUsageDescription =
        typeof permission === 'string' && permission.length > 0
          ? permission
          : DEFAULT_NFC_PERMISSION;
    }

    const key = 'com.apple.developer.nfc.readersession.iso7816.select-identifiers';
    const existing = Array.isArray(mod.modResults[key])
      ? mod.modResults[key]
      : [];
    mod.modResults[key] = [
      ...new Set([...DEFAULT_SELECT_IDENTIFIERS, ...existing, ...extraIds]),
    ];
    return mod;
  });

  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.nfc.readersession.formats'] = ['TAG'];
    return mod;
  });

  return config;
}

function withNfcCardScanner(config, props = {}) {
  config = withAndroidNfc(config);
  config = withIosNfc(config, props);
  return config;
}

module.exports = withNfcCardScanner;
module.exports.DEFAULT_SELECT_IDENTIFIERS = DEFAULT_SELECT_IDENTIFIERS;
