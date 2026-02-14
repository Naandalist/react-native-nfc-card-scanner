# Security & Compliance Notice

## Intended Use

This library is intended for use in controlled environments such as internal tools, testing systems, kiosks, or POS-like applications.

It does **not** implement PCI-DSS compliance, encryption, secure storage, or cardholder data protection mechanisms.

Developers are responsible for ensuring that any usage of this library complies with applicable security standards, privacy regulations, and payment network rules.

## What This Library Reads

| Data | Read | Notes |
|---|---|---|
| Card Number (PAN) | Yes | Primary Account Number |
| Expiry Date | Yes | MM/YY format |
| Card Scheme | Yes | Derived from AID prefix |
| CVV / CVC | No | Not accessible via EMV contactless |
| PIN | No | Not accessible via EMV contactless |
| Cardholder Name | No | Not extracted |
| Track 1 Data | No | Not extracted |

## What This Library Does NOT Provide

- **No encryption** — Card data is returned as plain strings. It is the developer's responsibility to encrypt, mask, or securely handle the data.
- **No secure storage** — The library does not persist any data. If you store card data, you must comply with PCI-DSS requirements.
- **No network transmission** — The library does not send data to any server. If you transmit card data, you must use TLS and comply with applicable regulations.
- **No tokenization** — The library does not tokenize card numbers. Consider using a payment processor's tokenization service for production use.
- **No PCI-DSS compliance** — This library alone does not make your application PCI-DSS compliant.

## Recommendations

If you use this library in a production or customer-facing environment:

1. **Mask the PAN** — Only display the first 4 and last 4 digits (e.g., `4111 **** **** 1111`)
2. **Do not log card data** — Avoid writing PAN or expiry to logs, crash reports, or analytics
3. **Do not store card data** — If storage is required, use a PCI-DSS compliant vault or tokenization service
4. **Use TLS** — If transmitting card data, always use encrypted connections
5. **Limit access** — Restrict NFC scanning functionality to authorized users or roles
6. **Comply with local regulations** — Card data handling is subject to PCI-DSS, GDPR, and other regional privacy laws

## Reporting Security Issues

If you discover a security vulnerability in this library, please report it responsibly:

- **Do not** open a public GitHub issue for security vulnerabilities
- Email: **listiananda.apriliawan@gmail.com**
- Include a description of the vulnerability and steps to reproduce

We will acknowledge receipt within 48 hours and work to address the issue promptly.
