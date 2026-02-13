export interface EmvObject {
  tag: string;
  length: string;
  value: string | EmvObject[];
  description?: string;
}

export interface NfcCardResult {
  card: string;
  exp: string;
}

export type CardScheme =
  | 'VISA'
  | 'MASTERCARD'
  | 'JCB'
  | 'AMEX'
  | 'UNIONPAY'
  | 'DISCOVER'
  | null;
