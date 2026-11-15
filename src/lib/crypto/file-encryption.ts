import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const keyB64 = process.env.FILE_ENCRYPTION_KEY;
  if (!keyB64) throw new Error("FILE_ENCRYPTION_KEY is not set");
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) {
    throw new Error(
      `FILE_ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}`
    );
  }
  return key;
}

export interface EncryptedFile {
  fileData: Uint8Array;
  iv: string;
  authTag: string;
}

export function encryptFile(plaintext: Buffer): EncryptedFile {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    fileData: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

export function decryptFile({ fileData, iv, authTag }: EncryptedFile): Buffer {
  const key = getKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  return Buffer.concat([decipher.update(fileData), decipher.final()]);
}
