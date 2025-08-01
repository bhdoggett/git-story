import crypto from "crypto";

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "your-fallback-encryption-key-32-chars-long";
const ALGORITHM = "aes-256-cbc";

console.log("🔐 ENCRYPTION SERVICE INITIALIZED:", {
  hasEnvKey: !!process.env.ENCRYPTION_KEY,
  envKeyLength: process.env.ENCRYPTION_KEY?.length || 0,
  usingFallback: !process.env.ENCRYPTION_KEY,
});

export class EncryptionService {
  private static getKey(): Buffer {
    // Ensure the key is exactly 32 bytes for AES-256
    return Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32));
  }

  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, this.getKey(), iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
  }

  static decrypt(encryptedText: string): string {
    console.log("🔓 DECRYPTING API KEY...");
    console.log("🔓 Input length:", encryptedText.length);

    const parts = encryptedText.split(":");
    console.log("🔓 Parts count:", parts.length);

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, this.getKey(), iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    console.log("🔓 Decrypted length:", decrypted.length);
    console.log(
      "🔓 Decrypted starts with:",
      decrypted.substring(0, 10) + "..."
    );

    return decrypted;
  }
}
