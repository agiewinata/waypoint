import { describe, it, expect } from "vitest";
import {
  todayJakarta,
  parseDateOnly,
  toDateOnly,
  nightsBetween,
  rangesOverlap,
} from "@/lib/dates";

describe("todayJakarta", () => {
  it("returns a Date at UTC midnight", () => {
    const d = todayJakarta();
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
    expect(d.getUTCMilliseconds()).toBe(0);
  });

  it("returns a valid Date", () => {
    const d = todayJakarta();
    expect(d instanceof Date).toBe(true);
    expect(isNaN(d.getTime())).toBe(false);
  });
});

describe("parseDateOnly", () => {
  it("parses a valid YYYY-MM-DD string to UTC midnight", () => {
    const d = parseDateOnly("2024-03-15");
    expect(d.toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });

  it("throws on invalid format", () => {
    expect(() => parseDateOnly("15-03-2024")).toThrow();
    expect(() => parseDateOnly("2024/03/15")).toThrow();
    expect(() => parseDateOnly("20240315")).toThrow();
    expect(() => parseDateOnly("")).toThrow();
    expect(() => parseDateOnly("2024-3-5")).toThrow();
  });
});

describe("toDateOnly", () => {
  it("formats a UTC midnight date to YYYY-MM-DD in Jakarta timezone", () => {
    // 2024-03-15T00:00:00Z is 2024-03-15T07:00:00+07:00 → still 2024-03-15
    const d = new Date("2024-03-15T00:00:00.000Z");
    expect(toDateOnly(d)).toBe("2024-03-15");
  });

  it("round-trips with parseDateOnly", () => {
    const original = "2024-06-01";
    const d = parseDateOnly(original);
    expect(toDateOnly(d)).toBe(original);
  });
});

describe("nightsBetween", () => {
  it("returns 0 for the same date", () => {
    const d = new Date("2024-01-01T00:00:00Z");
    expect(nightsBetween(d, d)).toBe(0);
  });

  it("returns 1 for consecutive days", () => {
    const start = new Date("2024-01-01T00:00:00Z");
    const end = new Date("2024-01-02T00:00:00Z");
    expect(nightsBetween(start, end)).toBe(1);
  });

  it("returns 7 for a week", () => {
    const start = parseDateOnly("2024-03-01");
    const end = parseDateOnly("2024-03-08");
    expect(nightsBetween(start, end)).toBe(7);
  });

  it("returns negative for reversed dates", () => {
    const start = new Date("2024-01-10T00:00:00Z");
    const end = new Date("2024-01-05T00:00:00Z");
    expect(nightsBetween(start, end)).toBeLessThan(0);
  });
});

describe("rangesOverlap", () => {
  const d = (s: string) => parseDateOnly(s);

  it("detects overlap when one range is inside another", () => {
    expect(rangesOverlap(d("2024-01-01"), d("2024-01-10"), d("2024-01-03"), d("2024-01-07"))).toBe(true);
  });

  it("detects overlap when ranges partially overlap", () => {
    expect(rangesOverlap(d("2024-01-01"), d("2024-01-05"), d("2024-01-03"), d("2024-01-08"))).toBe(true);
  });

  it("returns false for adjacent ranges (no overlap)", () => {
    // aEnd === bStart → they touch but do not overlap
    expect(rangesOverlap(d("2024-01-01"), d("2024-01-05"), d("2024-01-05"), d("2024-01-10"))).toBe(false);
  });

  it("returns false when ranges are completely separate", () => {
    expect(rangesOverlap(d("2024-01-01"), d("2024-01-03"), d("2024-01-05"), d("2024-01-08"))).toBe(false);
    expect(rangesOverlap(d("2024-02-01"), d("2024-02-10"), d("2024-01-01"), d("2024-01-20"))).toBe(false);
  });

  it("detects overlap when ranges share only end-to-start (not inclusive)", () => {
    // aStart < bEnd (2024-01-04 < 2024-01-10) && aEnd > bStart (2024-01-08 > 2024-01-04)
    expect(rangesOverlap(d("2024-01-04"), d("2024-01-08"), d("2024-01-04"), d("2024-01-10"))).toBe(true);
  });
});
