import { describe, it, expect } from "vitest";
import { parseDateOnly } from "@/lib/dates";
import { validateBookingDates } from "@/lib/validation/booking";

// Fixed "today" used across all date validation tests to avoid clock dependency.
const TODAY = parseDateOnly("2025-06-01");

describe("validateBookingDates", () => {
  it("accepts a valid range", () => {
    const start = parseDateOnly("2025-06-10");
    const end = parseDateOnly("2025-06-15");
    expect(() => validateBookingDates(start, end, TODAY)).not.toThrow();
  });

  it("throws when endDate equals startDate", () => {
    const d = parseDateOnly("2025-06-10");
    expect(() => validateBookingDates(d, d, TODAY)).toThrow(
      "End date must be after start date"
    );
  });

  it("throws when endDate is before startDate", () => {
    const start = parseDateOnly("2025-06-15");
    const end = parseDateOnly("2025-06-10");
    expect(() => validateBookingDates(start, end, TODAY)).toThrow(
      "End date must be after start date"
    );
  });

  it("throws when startDate is in the past", () => {
    const start = parseDateOnly("2025-05-31"); // before TODAY
    const end = parseDateOnly("2025-06-05");
    expect(() => validateBookingDates(start, end, TODAY)).toThrow(
      "Start date cannot be in the past"
    );
  });

  it("accepts startDate equal to today", () => {
    // today itself is valid (not in the past)
    const start = parseDateOnly("2025-06-01"); // == TODAY
    const end = parseDateOnly("2025-06-05");
    expect(() => validateBookingDates(start, end, TODAY)).not.toThrow();
  });

  it("throws when booking exceeds 30 nights", () => {
    const start = parseDateOnly("2025-06-01");
    const end = parseDateOnly("2025-07-02"); // 31 nights
    expect(() => validateBookingDates(start, end, TODAY)).toThrow(
      "Booking cannot exceed 30 nights"
    );
  });

  it("accepts exactly 30 nights", () => {
    const start = parseDateOnly("2025-06-01");
    const end = parseDateOnly("2025-07-01"); // exactly 30 nights
    expect(() => validateBookingDates(start, end, TODAY)).not.toThrow();
  });

  it("throws when startDate is more than 180 days ahead", () => {
    // 181 days after TODAY (2025-06-01)
    const msAhead = TODAY.getTime() + 181 * 86_400_000;
    const start = new Date(msAhead);
    // Align to midnight UTC for a clean date
    const startStr = start.toISOString().slice(0, 10);
    const startDate = parseDateOnly(startStr);
    const endDate = new Date(startDate.getTime() + 2 * 86_400_000);
    const endStr = endDate.toISOString().slice(0, 10);
    expect(() =>
      validateBookingDates(startDate, parseDateOnly(endStr), TODAY)
    ).toThrow("Start date cannot be more than 180 days in the future");
  });

  it("accepts startDate exactly 180 days ahead", () => {
    const msAhead = TODAY.getTime() + 180 * 86_400_000;
    const startStr = new Date(msAhead).toISOString().slice(0, 10);
    const start = parseDateOnly(startStr);
    // 1 night booking
    const endStr = new Date(start.getTime() + 86_400_000)
      .toISOString()
      .slice(0, 10);
    expect(() =>
      validateBookingDates(start, parseDateOnly(endStr), TODAY)
    ).not.toThrow();
  });
});

describe("parseDateOnly (re-used in booking validation)", () => {
  it("parses YYYY-MM-DD to UTC midnight", () => {
    const d = parseDateOnly("2025-07-04");
    expect(d.toISOString()).toBe("2025-07-04T00:00:00.000Z");
  });

  it("throws on non-ISO format", () => {
    expect(() => parseDateOnly("07/04/2025")).toThrow();
  });
});
