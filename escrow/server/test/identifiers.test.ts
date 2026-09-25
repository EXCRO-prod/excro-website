import { describe, expect, it } from "vitest";
import { isIndividualPan, maskAadhaar, maskAccount, maskEmail, maskMobile, maskPan, normaliseEmail, normaliseMobile } from "../src/identity/identifiers.js";

describe("normaliseMobile", () => {
  it("accepts plain 10-digit numbers, including ones starting with 91", () => {
    expect(normaliseMobile("9876543210")).toBe("9876543210");
    expect(normaliseMobile("9111111111")).toBe("9111111111"); // must not be mistaken for a "91" country code
  });
  it("strips a +91 / 91 / leading-0 prefix only when the length says it's really there", () => {
    expect(normaliseMobile("+91 98765 43210")).toBe("9876543210");
    expect(normaliseMobile("919876543210")).toBe("9876543210");
    expect(normaliseMobile("098765-43210")).toBe("9876543210");
  });
  it("rejects the wrong shape", () => {
    expect(normaliseMobile("12345")).toBeNull();
    expect(normaliseMobile("5876543210")).toBeNull(); // first digit must be 6-9
    expect(normaliseMobile("98765432100")).toBeNull(); // 11 digits, no valid prefix to strip
  });
});

describe("normaliseEmail", () => {
  it("lowercases and trims a valid address", () => {
    expect(normaliseEmail("  Buyer@Example.COM ")).toBe("buyer@example.com");
  });
  it("rejects a malformed address", () => {
    expect(normaliseEmail("not-an-email")).toBeNull();
  });
});

describe("masks and PAN type", () => {
  it("isIndividualPan requires the 4th letter P", () => {
    expect(isIndividualPan("ABCPE1234F")).toBe(true);
    expect(isIndividualPan("ABCCE1234F")).toBe(false);
  });
  it("masking hides everything but a safe tail", () => {
    expect(maskMobile("9876543210")).toBe("+91 ******3210");
    expect(maskPan("ABCPE1234F")).toBe("*****1234F");
    expect(maskAadhaar("4471")).toBe("XXXX XXXX 4471");
    expect(maskAccount("6411")).toBe("••••6411");
    expect(maskEmail("buyer@example.com")).toBe("b***@example.com");
  });
});
