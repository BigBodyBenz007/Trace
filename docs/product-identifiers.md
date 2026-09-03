# Product identifiers

Nutrition catalog records may contain this optional structured field:

```js
identifiers: [{ scheme: "gtin", value: "00012000001291" }]
```

Identifier values are always strings. They must never be parsed or stored as
numbers because leading zeroes are meaningful.

The `gtin` scheme accepts the four GS1 GTIN-family lengths:

- 8 digits: GTIN-8 / EAN-8
- 12 digits: GTIN-12 / UPC-A
- 13 digits: GTIN-13 / EAN-13
- 14 digits: GTIN-14

Normalization trims surrounding whitespace and removes embedded whitespace and
hyphens. It rejects non-ASCII digits, unsupported lengths, unknown schemes, and
invalid GS1 modulo-10 check digits. Stored normalized values contain digits
only and preserve their original supported length and all leading zeroes.

Lookup and collision detection compare the normalized value as a zero-padded
14-digit GTIN. Equivalent UPC-A, EAN-13, and GTIN-14 representations therefore
resolve to the same catalog item and cannot be assigned to different items.

Identifiers describe products, not access rights. Camera scanning, remote
nutrition lookup, and feature entitlement are outside this contract.
