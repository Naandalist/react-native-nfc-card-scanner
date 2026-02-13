import { EmvObject } from '../types';
import emvTags from './tags';
import * as util from './utils';

// Types
type Callback<T> = (result: T) => void;

interface EmvTagItem {
  tag: string;
  kernel: string;
  name: string;
}

// Look up a tag name in the kernel
function lookupKernel(
  tag: string,
  kernel: string,
  callback: Callback<string | undefined>,
): void {
  const found = emvTags.filter(
    (item: EmvTagItem) =>
      item.tag === tag && item.kernel.toUpperCase() === kernel.toUpperCase(),
  );
  callback(found.length ? found[0].name : undefined);
}

// Get value for a tag from a list of EMV objects
function getValue(
  tag: string,
  emv_objects: EmvObject[],
  callback: Callback<string | EmvObject[]>,
): void {
  emv_objects.forEach((item) => {
    if (item.tag === tag) {
      callback(item.value);
    }
  });
}

// Get the element (object) with a given tag from a list
function getElement(
  tag: string,
  emv_objects: EmvObject[],
  callback: Callback<EmvObject>,
): void {
  emv_objects.forEach((item) => {
    if (item.tag === tag) {
      callback(item);
    }
  });
}

// Parse TLV-encoded EMV data
function parse(emv_data: string, callback: Callback<EmvObject[]>): void {
  const emv_objects: EmvObject[] = [];
  let data = emv_data;

  while (data.length > 0) {
    const tag_bin_initial = util.Hex2Bin(data.substring(0, 2));
    let tag_bin =
      typeof tag_bin_initial === 'string'
        ? util.pad(tag_bin_initial, 8)
        : '00000000';
    let tag_limit = 2;
    const tag_class = tag_bin.substring(0, tag_limit);
    const tag_constructed = tag_bin.substring(2, 3);
    let tag_number = tag_bin.substring(3, 8);
    let tag_octet = '';

    if (tag_number === '11111') {
      do {
        tag_limit += 2;
        const tag_octet_result = util.Hex2Bin(
          data.substring(tag_limit - 2, tag_limit),
        );
        tag_octet =
          typeof tag_octet_result === 'string'
            ? util.pad(tag_octet_result, 8)
            : '';
      } while (tag_octet.substring(0, 1) === '1');
      const tag_bin_result = util.Hex2Bin(data.substring(0, tag_limit));
      tag_bin =
        typeof tag_bin_result === 'string'
          ? util.pad(tag_bin_result, 8 * (tag_limit / 2))
          : '';
      tag_number = tag_bin.substring(3, 8 * (tag_limit / 2));
    }

    const tagResult = util.Bin2Hex(tag_class + tag_constructed + tag_number);
    const tag = typeof tagResult === 'string' ? tagResult.toUpperCase() : '';
    let lenHex = data.substring(tag.length, tag.length + 2);

    let byteToBeRead = 0;
    let lenDec = util.Hex2Dec(lenHex);
    let len = Number(lenDec) * 2;
    let offset = tag.length + 2 + len;

    if (lenHex.substring(0, 1) === '8') {
      const byteDecResult = util.Hex2Dec(lenHex.substring(1, 2));
      byteToBeRead = Number(byteDecResult);
      lenHex = data.substring(tag.length, tag.length + 2 + byteToBeRead * 2);
      const lenDecResult = util.Hex2Dec(lenHex.substring(2));
      len = Number(lenDecResult) * 2;
      offset = tag.length + 2 + byteToBeRead * 2 + len;
    }

    let value: string | EmvObject[] = data.substring(
      tag.length + 2 + byteToBeRead * 2,
      offset,
    );

    if (tag_constructed === '1') {
      parse(value, (innerTags: EmvObject[]) => {
        value = innerTags;
      });
    }

    emv_objects.push({ tag, length: lenHex, value });
    data = data.substring(offset);
  }

  callback(emv_objects);
}

// Describe all tags for a given kernel
function describeKernel(
  emv_data: string,
  kernel: string,
  callback: Callback<EmvObject[]>,
): void {
  const emv_objects: EmvObject[] = [];
  parse(emv_data, (tlv_list: EmvObject[]) => {
    if (tlv_list != null) {
      for (let i = 0; i < tlv_list.length; i++) {
        lookupKernel(tlv_list[i].tag, kernel, (data) => {
          const inner_list = tlv_list[i].value;
          if (Array.isArray(inner_list)) {
            for (let j = 0; j < inner_list.length; j++) {
              const innerItem = inner_list[j];
              if (typeof innerItem === 'object' && innerItem !== null) {
                lookupKernel(innerItem.tag, kernel, (jdata) => {
                  if (jdata) {
                    innerItem.description = jdata;
                  }
                });
              }
            }
          }
          if (data) {
            tlv_list[i].description = data;
          }
          emv_objects.push(tlv_list[i]);
        });
      }
      callback(emv_objects);
    }
  });
}

export default {
  parse: (emv_data: string, callback: Callback<EmvObject[]>) =>
    parse(emv_data, callback),
  describe: (emv_data: string, callback: Callback<EmvObject[]>) =>
    describeKernel(emv_data, 'Generic', callback),
  lookup: (emv_tag: string, callback: Callback<string | undefined>) =>
    lookupKernel(emv_tag, 'Generic', callback),
  describeKernel: (
    emv_data: string,
    kernel: string,
    callback: Callback<EmvObject[]>,
  ) => describeKernel(emv_data, kernel, callback),
  lookupKernel: (
    emv_tag: string,
    kernel: string,
    callback: Callback<string | undefined>,
  ) => lookupKernel(emv_tag, kernel, callback),
  getValue: (
    emv_tag: string,
    emv_objects: EmvObject[],
    callback: Callback<string | EmvObject[]>,
  ) => getValue(emv_tag, emv_objects, callback),
  getElement: (
    emv_tag: string,
    emv_objects: EmvObject[],
    callback: Callback<EmvObject>,
  ) => getElement(emv_tag, emv_objects, callback),
};
