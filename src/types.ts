export interface EmvObject {
  tag: string;
  length: string;
  value: string | EmvObject[];
  description?: string;
}

export interface NfcCardResult {
  card: string;
  exp: string;
  scheme: CardScheme;
}

export interface ScanNfcOptions {
  timeout?: number;
}

export const NfcError = {
  NFC_NOT_SUPPORTED: 'NFC_NOT_SUPPORTED',
  NFC_NOT_ENABLED: 'NFC_NOT_ENABLED',
  AID_NOT_FOUND: 'AID_NOT_FOUND',
  UNSUPPORTED_CARD_SCHEME: 'UNSUPPORTED_CARD_SCHEME',
  CARD_READ_FAILED: 'CARD_READ_FAILED',
  SCAN_TIMEOUT: 'SCAN_TIMEOUT',
} as const;

export type CardScheme =
  | 'VISA'
  | 'MASTERCARD'
  | 'JCB'
  | 'AMEX'
  | 'UNIONPAY'
  | 'DISCOVER'
  | null;
