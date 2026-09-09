export interface EmvObject {
  tag: string;
  length: string;
  value: string | EmvObject[];
  description?: string;
}

export interface NfcCardResult {
  /** @deprecated Use `pan`. Kept for backwards compatibility. */
  card: string;
  pan: string;
  maskedPan: string;
  exp: string;
  scheme: CardScheme;
  aid?: string;
}

export interface ScanNfcOptions {
  timeout?: number;
  /** When true, `card` and `pan` are masked (first 4 + last 4). */
  maskPan?: boolean;
}

export const NfcError = {
  NFC_NOT_SUPPORTED: 'NFC_NOT_SUPPORTED',
  NFC_NOT_ENABLED: 'NFC_NOT_ENABLED',
  AID_NOT_FOUND: 'AID_NOT_FOUND',
  UNSUPPORTED_CARD_SCHEME: 'UNSUPPORTED_CARD_SCHEME',
  CARD_READ_FAILED: 'CARD_READ_FAILED',
  SCAN_TIMEOUT: 'SCAN_TIMEOUT',
} as const;

export type NfcErrorCode = (typeof NfcError)[keyof typeof NfcError];

export class NfcScanError extends Error {
  readonly code: NfcErrorCode;

  constructor(code: NfcErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'NfcScanError';
    this.code = code;
  }
}

export type CardScheme =
  | 'VISA'
  | 'MASTERCARD'
  | 'JCB'
  | 'AMEX'
  | 'UNIONPAY'
  | 'DISCOVER'
  | null;
