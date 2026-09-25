import { describe, expect, it } from "vitest";
import { floorSplit, formatInr, max, min, mulBps, mulDivHalfEven, splitToFirst, sum, MoneyError } from "../src/domain/money.js";

describe("mulDivHalfEven (banker's rounding)", () => {
  it("rounds ties to even and non-ties to nearest", () => {
    expect(mulDivHalfEven(1n, 1n, 2n)).toBe(0n); // 0.5 -> 0
    expect(mulDivHalfEven(3n, 1n, 2n)).toBe(2n); // 1.5 -> 2
    expect(mulDivHalfEven(5n, 1n, 2n)).toBe(2n); // 2.5 -> 2
    expect(mulDivHalfEven(7n, 1n, 2n)).toBe(4n); // 3.5 -> 4
    expect(mulDivHalfEven(1n, 1n, 3n)).toBe(0n);
    expect(mulDivHalfEven(2n, 1n, 3n)).toBe(1n);
    expect(mulDivHalfEven(10n, 3n, 5n)).toBe(6n); // exact
  });
  it("never uses floats: huge values stay exact", () => {
    const big = 9_007_199_254_740_993n * 100n;
    expect(mulDivHalfEven(big, 50n, 10_000n)).toBe(big / 200n);
  });
  it("rejects negative operands and bad divisors", () => {
    expect(() => mulDivHalfEven(-1n, 1n, 1n)).toThrow(MoneyError);
    expect(() => mulDivHalfEven(1n, -1n, 1n)).toThrow(MoneyError);
    expect(() => mulDivHalfEven(1n, 1n, 0n)).toThrow(MoneyError);
  });
  it("mulBps applies basis points", () => {
    expect(mulBps(184_000_000n, 50)).toBe(920_000n);
    expect(mulBps(184_000_000n, 0)).toBe(0n);
  });
});

describe("splits", () => {
  it("floorSplit returns the remainder instead of dropping it", () => {
    const { parts, remainder } = floorSplit(100n, [3333, 3333, 3334]);
    expect(parts).toEqual([33n, 33n, 33n]);
    expect(remainder).toBe(1n);
    expect(sum(parts) + remainder).toBe(100n);
  });
  it("floorSplit validates inputs", () => {
    expect(() => floorSplit(-1n, [1])).toThrow(MoneyError);
    expect(() => floorSplit(1n, [0, 0])).toThrow(MoneyError);
    expect(() => floorSplit(1n, [-1, 2])).toThrow(MoneyError);
  });
  it("splitToFirst puts the leftover on the first share", () => {
    expect(splitToFirst(100n, [3333, 3333, 3334])).toEqual([34n, 33n, 33n]);
    expect(splitToFirst(0n, [5000, 5000])).toEqual([0n, 0n]);
  });
});

describe("helpers", () => {
  it("sum/min/max", () => {
    expect(sum([])).toBe(0n);
    expect(sum([1n, 2n])).toBe(3n);
    expect(min(1n, 2n)).toBe(1n);
    expect(min(2n, 1n)).toBe(1n);
    expect(max(1n, 2n)).toBe(2n);
    expect(max(2n, 1n)).toBe(2n);
  });
  it("formats rupees with Indian grouping", () => {
    expect(formatInr(173_466_000n)).toBe("₹17,34,660.00");
    expect(formatInr(184_460_000n)).toBe("₹18,44,600.00");
    expect(formatInr(5n)).toBe("₹0.05");
    expect(formatInr(99_900n)).toBe("₹999.00");
    expect(formatInr(-100n)).toBe("-₹1.00");
  });
});
