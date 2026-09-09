import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-native-nfc-manager', () => {
  return {
    default: {
      isSupported: vi.fn().mockResolvedValue(true),
      isEnabled: vi.fn().mockResolvedValue(true),
      start: vi.fn().mockResolvedValue(undefined),
      registerTagEvent: vi.fn().mockResolvedValue(undefined),
      requestTechnology: vi.fn().mockResolvedValue(undefined),
      cancelTechnologyRequest: vi.fn().mockResolvedValue(undefined),
      unregisterTagEvent: vi.fn().mockResolvedValue(undefined),
      isoDepHandler: {
        transceive: vi.fn(),
      },
    },
    NfcTech: { IsoDep: 'IsoDep' },
    NfcAdapter: {},
  };
});

import NfcManager from 'react-native-nfc-manager';
import { scanNfc } from '../scanner';
import { NfcError } from '../types';

const transceive = () => NfcManager.isoDepHandler.transceive as ReturnType<typeof vi.fn>;

const toBytes = (hex: string): number[] => {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out: number[] = [];
  for (let i = 0; i < normalized.length; i += 2) {
    out.push(parseInt(normalized.substring(i, i + 2), 16));
  }
  return out;
};

describe('scanNfc EMV flow', () => {
  beforeEach(() => {
    transceive().mockReset();
  });

  it('reads PAN and expiry via PDOL GPO and AFL records', async () => {
    transceive()
      .mockResolvedValueOnce(
        toBytes('6F1C840E325041592E5359532E4444463031A50A4F07A00000000310109000'),
      )
      .mockResolvedValueOnce(
        toBytes('6F148407A0000000031010A5099F38049F66049000'),
      )
      .mockResolvedValueOnce(toBytes('80060000080101009000'))
      .mockResolvedValueOnce(
        toBytes('700F5A0841111111111111115F24032712319000'),
      );

    const result = await scanNfc();

    expect(result.scheme).toBe('VISA');
    expect(result.card).toBe('4111111111111111');
    expect(result.pan).toBe('4111111111111111');
    expect(result.maskedPan).toBe('4111********1111');
    expect(result.exp).toBe('12/27');
    expect(result.aid).toBe('A0000000031010');
    expect(transceive()).toHaveBeenCalledTimes(4);
  });

  it('masks PAN when maskPan is true', async () => {
    transceive()
      .mockResolvedValueOnce(
        toBytes('6F1C840E325041592E5359532E4444463031A50A4F07A00000000310109000'),
      )
      .mockResolvedValueOnce(
        toBytes('6F148407A0000000031010A5099F38049F66049000'),
      )
      .mockResolvedValueOnce(toBytes('80060000080101009000'))
      .mockResolvedValueOnce(
        toBytes('700F5A0841111111111111115F24032712319000'),
      );

    const result = await scanNfc({ maskPan: true });
    expect(result.pan).toBe('4111********1111');
    expect(result.card).toBe('4111********1111');
    expect(result.maskedPan).toBe('4111********1111');
  });

  it('throws CARD_READ_FAILED when records have no PAN', async () => {
    transceive()
      .mockResolvedValueOnce(
        toBytes('6F1C840E325041592E5359532E4444463031A50A4F07A00000000310109000'),
      )
      .mockResolvedValueOnce(toBytes('6F078407A00000000310109000'))
      .mockResolvedValueOnce(toBytes('80060000080101009000'))
      .mockResolvedValueOnce(toBytes('70025F24032712319000'));

    await expect(scanNfc()).rejects.toMatchObject({
      code: NfcError.CARD_READ_FAILED,
    });
  });

  it('throws NfcScanError for missing AID', async () => {
    transceive().mockResolvedValueOnce(toBytes('6F00'));
    await expect(scanNfc()).rejects.toMatchObject({
      name: 'NfcScanError',
      code: NfcError.AID_NOT_FOUND,
    });
  });
});
