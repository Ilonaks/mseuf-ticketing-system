import { describe, expect, it } from "vitest";
import { TICKET_CODE, validateEvent, validateLogin, validateRegister } from "../utils/validation";

describe("validateLogin", () => {
  it("requires email and password", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: "Enter your email.",
      password: "Enter your password.",
    });
  });

  it("rejects a malformed email", () => {
    expect(validateLogin({ email: "juan@", password: "x" }).email).toBe("Enter a valid email address.");
  });

  it("accepts valid input", () => {
    expect(validateLogin({ email: "juan@mseuf.edu.ph", password: "password123" })).toEqual({});
  });
});

describe("validateRegister", () => {
  const valid = {
    name: "Juan Dela Cruz",
    email: "juan@mseuf.edu.ph",
    student_id: "2023-00001",
    password: "secret123",
    password_confirmation: "secret123",
  };

  it("accepts a valid form, with or without a student ID", () => {
    expect(validateRegister(valid)).toEqual({});
    expect(validateRegister({ ...valid, student_id: "" })).toEqual({});
  });

  it.each([
    [{ name: "J4n" }, "name"],
    [{ student_id: "12345" }, "student_id"],
    [{ password: "short1", password_confirmation: "short1" }, "password"],
    [{ password: "lettersonly", password_confirmation: "lettersonly" }, "password"],
    [{ password_confirmation: "different1" }, "password_confirmation"],
  ])("flags %o on %s", (overrides, field) => {
    expect(validateRegister({ ...valid, ...overrides })).toHaveProperty(field);
  });

  it("accepts names with accents, periods, and hyphens", () => {
    expect(validateRegister({ ...valid, name: "Ma. Niña Santos-Reyes" })).toEqual({});
  });
});

describe("validateEvent", () => {
  const inAWeek = new Date(Date.now() + 7 * 864e5);
  const local = (d) => d.toISOString().slice(0, 16);
  const valid = {
    title: "Science Fair",
    description: "",
    venue: "Gym",
    start_at: local(inAWeek),
    end_at: local(new Date(inAWeek.getTime() + 3 * 36e5)),
    capacity: 100,
    price: 0,
  };

  it("accepts a valid event", () => {
    expect(validateEvent(valid, { isEdit: false })).toEqual({});
  });

  it("requires the end to be after the start", () => {
    expect(validateEvent({ ...valid, end_at: valid.start_at }, { isEdit: false })).toHaveProperty("end_at");
  });

  it("requires new events to start in the future, but allows past starts when editing", () => {
    const past = { ...valid, start_at: local(new Date(Date.now() - 864e5)) };
    expect(validateEvent(past, { isEdit: false })).toHaveProperty("start_at");
    expect(validateEvent(past, { isEdit: true })).not.toHaveProperty("start_at");
  });

  it("does not let capacity drop below tickets already issued", () => {
    expect(validateEvent({ ...valid, capacity: 5 }, { isEdit: true, minCapacity: 10 }).capacity).toMatch(/already issued/);
  });

  it("rejects negative prices and fractional capacity", () => {
    const errors = validateEvent({ ...valid, price: -1, capacity: 2.5 }, { isEdit: false });
    expect(errors).toHaveProperty("price");
    expect(errors).toHaveProperty("capacity");
  });
});

describe("TICKET_CODE", () => {
  it("matches real codes only", () => {
    expect(TICKET_CODE.test("MSEUF-A8K2PX9Q")).toBe(true);
    expect(TICKET_CODE.test("MSEUF-A8K2")).toBe(false);
    expect(TICKET_CODE.test("https://example.com")).toBe(false);
  });
});
