import { describe, it, expect, beforeAll } from "vitest";
import { encryptFile, decryptFile } from "@/lib/crypto/file-encryption";

beforeAll(() => {
  // 32 random bytes as base64 — fixed for repeatability
  process.env.FILE_ENCRYPTION_KEY = Buffer.from(
    "0123456789abcdef0123456789abcdef"
  ).toString("base64");
});

describe("encryptFile / decryptFile", () => {
  it("round-trips a buffer", () => {
    const original = Buffer.from("Hello, Waypoint!");
    const encrypted = encryptFile(original);
    const decrypted = decryptFile(encrypted);
    expect(decrypted).toEqual(original);
  });

  it("produces different ciphertext on each call (random IV)", () => {
    const buf = Buffer.from("same content");
    const a = encryptFile(buf);
    const b = encryptFile(buf);
    expect(a.iv).not.toBe(b.iv);
    expect(Buffer.from(a.fileData).toString("hex")).not.toBe(Buffer.from(b.fileData).toString("hex"));
  });

  it("throws on tampered ciphertext", () => {
    const { fileData, iv, authTag } = encryptFile(Buffer.from("secret"));
    const tampered = Buffer.from(fileData);
    tampered[0] ^= 0xff;
    expect(() => decryptFile({ fileData: tampered, iv, authTag })).toThrow();
  });

  it("throws on tampered authTag", () => {
    const { fileData, iv, authTag } = encryptFile(Buffer.from("secret"));
    const badTag = authTag.replace(/.$/, authTag.slice(-1) === "0" ? "1" : "0");
    expect(() => decryptFile({ fileData, iv, authTag: badTag })).toThrow();
  });

  it("throws on tampered IV", () => {
    const { fileData, iv, authTag } = encryptFile(Buffer.from("secret"));
    const badIv = iv.replace(/.$/, iv.slice(-1) === "0" ? "1" : "0");
    // With a different IV the GCM auth tag check fails
    expect(() => decryptFile({ fileData, iv: badIv, authTag })).toThrow();
  });

  it("throws when key is not 32 bytes", () => {
    const originalKey = process.env.FILE_ENCRYPTION_KEY;
    process.env.FILE_ENCRYPTION_KEY = Buffer.from("tooshort").toString("base64");
    expect(() => encryptFile(Buffer.from("x"))).toThrow(/32 bytes/);
    process.env.FILE_ENCRYPTION_KEY = originalKey;
  });

  it("throws when key is missing", () => {
    const originalKey = process.env.FILE_ENCRYPTION_KEY;
    delete process.env.FILE_ENCRYPTION_KEY;
    expect(() => encryptFile(Buffer.from("x"))).toThrow();
    process.env.FILE_ENCRYPTION_KEY = originalKey;
  });
});
