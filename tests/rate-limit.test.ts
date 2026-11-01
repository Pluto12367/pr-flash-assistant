import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit } from "../lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00Z"));
  });

  it("allows the first request", () => {
    expect(checkRateLimit("client-a")).toEqual({
      allowed: true,
      retryAfterSeconds: 0
    });
  });

  it("allows up to the request limit within the window", () => {
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit("client-b").allowed).toBe(true);
    }
  });

  it("rejects requests beyond the limit", () => {
    for (let i = 0; i < 20; i++) checkRateLimit("client-c");
    const result = checkRateLimit("client-c");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the bucket after the window elapses", () => {
    for (let i = 0; i < 20; i++) checkRateLimit("client-d");
    expect(checkRateLimit("client-d").allowed).toBe(false);

    vi.advanceTimersByTime(60_000);
    expect(checkRateLimit("client-d").allowed).toBe(true);
  });

  it("tracks different keys independently", () => {
    for (let i = 0; i < 20; i++) checkRateLimit("client-e");
    expect(checkRateLimit("client-e").allowed).toBe(false);
    expect(checkRateLimit("client-f").allowed).toBe(true);
  });
});
