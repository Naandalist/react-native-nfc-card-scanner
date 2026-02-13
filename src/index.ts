// NFC Scanner
export {
  scanNfc,
  stopNfc,
  isNfcEnabled,
  isNfcSupported,
  getCardSchemeFromAid,
} from './scanner';

// EMV Parser
export { default as emv } from './emv';

// Types & Constants
export type { EmvObject, NfcCardResult, CardScheme, ScanNfcOptions } from './types';
export { NfcError } from './types';
