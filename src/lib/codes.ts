import { randomInt } from "crypto";

// No look-alike characters (0/O, 1/I/L).
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DIGITS = "0123456789";

export function classCode() {
  return Array.from({ length: 6 }, () => ALPHA[randomInt(ALPHA.length)]).join("");
}

export function personalCode() {
  return Array.from({ length: 6 }, () => DIGITS[randomInt(DIGITS.length)]).join("");
}
