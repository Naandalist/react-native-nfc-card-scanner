import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  scanNfc,
  stopNfc,
  isNfcSupported,
  isNfcEnabled,
  NfcError,
} from 'react-native-nfc-card-scanner';
import type {NfcCardResult, CardScheme} from 'react-native-nfc-card-scanner';

function maskCardNumber(card: string): string {
  if (card.length < 8) {
    return card;
  }
  const first = card.slice(0, 4);
  const last = card.slice(-4);
  const masked = '*'.repeat(card.length - 8);
  return `${first} ${masked.match(/.{1,4}/g)?.join(' ') ?? masked} ${last}`;
}

function getSchemeStyle(scheme: CardScheme) {
  switch (scheme) {
    case 'VISA':
      return styles.schemeVisa;
    case 'MASTERCARD':
      return styles.schemeMastercard;
    case 'JCB':
      return styles.schemeJcb;
    case 'AMEX':
      return styles.schemeAmex;
    case 'DISCOVER':
      return styles.schemeDiscover;
    case 'UNIONPAY':
      return styles.schemeUnionpay;
    default:
      return styles.schemeDefault;
  }
}

function getStatusDotStyle(value: boolean | null) {
  if (value === null) {
    return styles.statusDotUnknown;
  }
  return value ? styles.statusDotActive : styles.statusDotInactive;
}

function App(): React.JSX.Element {
  const [scanning, setScanning] = useState(false);
  const [cardResult, setCardResult] = useState<NfcCardResult | null>(null);
  const [nfcStatus, setNfcStatus] = useState<{
    supported: boolean | null;
    enabled: boolean | null;
  }>({supported: null, enabled: null});

  useEffect(() => {
    checkNfcStatus();
  }, []);

  async function checkNfcStatus() {
    try {
      const supported = await isNfcSupported();
      const enabled = supported ? await isNfcEnabled() : false;
      setNfcStatus({supported, enabled});
    } catch {
      setNfcStatus({supported: false, enabled: false});
    }
  }

  async function handleScan() {
    setCardResult(null);
    setScanning(true);

    try {
      const result = await scanNfc({timeout: 60000});
      setCardResult(result);
    } catch (error: any) {
      const message = error?.message ?? 'Unknown error';

      switch (message) {
        case NfcError.NFC_NOT_SUPPORTED:
          Alert.alert('Error', 'NFC is not supported on this device.');
          break;
        case NfcError.NFC_NOT_ENABLED:
          Alert.alert('Error', 'Please enable NFC in your device settings.');
          break;
        case NfcError.SCAN_TIMEOUT:
          Alert.alert('Timeout', 'NFC scan timed out. Please try again.');
          break;
        case NfcError.AID_NOT_FOUND:
        case NfcError.UNSUPPORTED_CARD_SCHEME:
          Alert.alert('Unsupported Card', 'This card type is not supported.');
          break;
        case NfcError.CARD_READ_FAILED:
          Alert.alert('Read Failed', 'Failed to read card data. Try again.');
          break;
        default:
          Alert.alert('Error', message);
      }
    } finally {
      setScanning(false);
    }
  }

  function handleStop() {
    stopNfc();
    setScanning(false);
  }

  function handleReset() {
    setCardResult(null);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <Text style={styles.title}>NFC Card Scanner</Text>
        <Text style={styles.subtitle}>
          Tap your contactless card to read it
        </Text>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <View
            style={[
              styles.statusDot,
              getStatusDotStyle(nfcStatus.supported),
            ]}
          />
          <Text style={styles.statusText}>
            NFC {nfcStatus.supported ? 'Supported' : 'Not Supported'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <View
            style={[
              styles.statusDot,
              getStatusDotStyle(nfcStatus.enabled),
            ]}
          />
          <Text style={styles.statusText}>
            {nfcStatus.enabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {cardResult ? (
          <View style={styles.card}>
            {cardResult.scheme && (
              <View
                style={[
                  styles.schemeBadge,
                  getSchemeStyle(cardResult.scheme),
                ]}>
                <Text style={styles.schemeText}>{cardResult.scheme}</Text>
              </View>
            )}
            <Text style={styles.cardNumber}>
              {maskCardNumber(cardResult.card)}
            </Text>
            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.cardLabel}>EXPIRY</Text>
                <Text style={styles.cardValue}>{cardResult.exp}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.placeholder}>
            {scanning ? (
              <>
                <ActivityIndicator size="large" color="#e94560" />
                <Text style={styles.scanningText}>
                  {Platform.OS === 'android'
                    ? 'Hold your card against the back of the device...'
                    : 'Ready to scan...'}
                </Text>
              </>
            ) : (
              <Text style={styles.placeholderText}>
                Press "Scan Card" to start
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {cardResult ? (
          <TouchableOpacity style={styles.button} onPress={handleReset}>
            <Text style={styles.buttonText}>Scan Another</Text>
          </TouchableOpacity>
        ) : scanning ? (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={handleStop}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.button,
              !nfcStatus.enabled && styles.buttonDisabled,
            ]}
            onPress={handleScan}
            disabled={!nfcStatus.enabled}>
            <Text style={styles.buttonText}>Scan Card</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 24,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotUnknown: {
    backgroundColor: '#888',
  },
  statusDotActive: {
    backgroundColor: '#4CAF50',
  },
  statusDotInactive: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 12,
    color: '#aaa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  schemeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 24,
  },
  schemeVisa: {
    backgroundColor: '#1A1F71',
  },
  schemeMastercard: {
    backgroundColor: '#EB001B',
  },
  schemeJcb: {
    backgroundColor: '#0B7BC0',
  },
  schemeAmex: {
    backgroundColor: '#006FCF',
  },
  schemeDiscover: {
    backgroundColor: '#FF6000',
  },
  schemeUnionpay: {
    backgroundColor: '#D40F1E',
  },
  schemeDefault: {
    backgroundColor: '#666666',
  },
  schemeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardNumber: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 24,
    fontVariant: ['tabular-nums'],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 10,
    color: '#666',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  placeholderText: {
    fontSize: 16,
    color: '#555',
  },
  scanningText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  button: {
    backgroundColor: '#e94560',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#555',
  },
  buttonDisabled: {
    backgroundColor: '#333',
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
