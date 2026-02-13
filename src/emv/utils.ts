// util.ts

// Checks if n is a binary string (1-64 digits)
export function checkBin(n: string): boolean {
  return /^[01]{1,64}$/.test(n);
}

// Checks if n is a decimal string (1-64 digits)
export function checkDec(n: string): boolean {
  return /^[0-9]{1,64}$/.test(n);
}

// Checks if n is a hexadecimal string (1-64 digits)
export function checkHex(n: string): boolean {
  return /^[0-9A-Fa-f]{1,64}$/.test(n);
}

// Pads string s with leading zeros to reach length z
export function pad(s: string | number, z: number): string {
  const str = String(s);
  return str.length < z ? pad('0' + str, z) : str;
}

// Removes leading zeros from string s
export function unpad(s: string | number): string {
  return String(s).replace(/^0+/, '');
}

// Converts decimal string or number n to binary string
export function Dec2Bin(n: string | number): string | 0 {
  if (!checkDec(String(n)) || Number(n) < 0) {
    return 0;
  }
  return Number(n).toString(2);
}

// Converts decimal string or number n to hexadecimal string
export function Dec2Hex(n: string | number): string | 0 {
  if (!checkDec(String(n)) || Number(n) < 0) {
    return 0;
  }
  return Number(n).toString(16);
}

// Converts binary string n to decimal string
export function Bin2Dec(n: string): string | 0 {
  if (!checkBin(n)) {
    return 0;
  }
  return parseInt(n, 2).toString(10);
}

// Converts binary string n to hexadecimal string
export function Bin2Hex(n: string): string | 0 {
  if (!checkBin(n)) {
    return 0;
  }
  return parseInt(n, 2).toString(16);
}

// Converts hexadecimal string n to binary string
export function Hex2Bin(n: string): string | 0 {
  if (!checkHex(n)) {
    return 0;
  }
  return parseInt(n, 16).toString(2);
}

// Converts hexadecimal string n to decimal string
export function Hex2Dec(n: string): string | 0 {
  if (!checkHex(n)) {
    return 0;
  }
  return parseInt(n, 16).toString(10);
}

// Converts hexadecimal string to ASCII string
export function Hex2Ascii(hexx: string | number): string {
  const hex = String(hexx);
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

// Replaces the character at the given index in a string
export function replaceAt(
  str: string | number,
  index: number,
  character: string,
): string {
  const s = String(str);
  return s.substr(0, index) + character + s.substr(index + character.length);
}
