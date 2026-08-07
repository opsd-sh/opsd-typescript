import { describe, expect, it } from "vitest";
import { ApiCredential, InvalidApiCredentialError } from "../src/index.js";

describe("ApiCredential", () => {
  it("redacts the secret", () => {
    const credential = new ApiCredential("opsd_key_secret");

    expect(credential.toString()).toBe("ApiCredential([REDACTED])");
    expect(JSON.stringify(credential)).not.toContain("opsd_key_secret");
  });

  it.each(["", "contains space", "contains\nnewline", "contains\0null", "\u007f", "£"])(
    "rejects an invalid secret",
    (secret) => {
      expect(() => new ApiCredential(secret)).toThrow(InvalidApiCredentialError);
    },
  );

  it("rejects a non-string value passed from JavaScript", () => {
    expect(() => new ApiCredential(42 as never)).toThrow(InvalidApiCredentialError);
  });
});
