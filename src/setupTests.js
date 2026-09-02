// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { webcrypto } from "crypto";
import { TextDecoder, TextEncoder } from "util";

if (typeof global.TextEncoder !== "function") global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder !== "function") global.TextDecoder = TextDecoder;
if (!global.crypto?.subtle) {
  Object.defineProperty(global, "crypto", { configurable: true, value: webcrypto });
}
