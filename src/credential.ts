import { InvalidApiCredentialError } from "./errors.js";

const authorizationHeaders = new WeakMap<ApiCredential, string>();

/** A secret used to authenticate requests to the public Opsd API. */
export class ApiCredential {
  public constructor(secret: string) {
    if (typeof secret !== "string" || !secret || !isVisibleAscii(secret)) {
      throw new InvalidApiCredentialError();
    }

    authorizationHeaders.set(this, `Bearer ${secret}`);
  }

  public toString(): string {
    return "ApiCredential([REDACTED])";
  }
}

export function authorizationHeader(credential: ApiCredential): string {
  const value = authorizationHeaders.get(credential);
  if (value === undefined) {
    throw new InvalidApiCredentialError();
  }
  return value;
}

function isVisibleAscii(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || codePoint < 0x21 || codePoint > 0x7e) {
      return false;
    }
  }
  return true;
}
