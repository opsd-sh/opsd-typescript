import { type ApiCredential, authorizationHeader } from "./credential.js";
import {
  ApiError,
  InvalidBaseUrlError,
  type ProblemDetails,
  TransportError,
  UnexpectedResponseError,
} from "./errors.js";
import type { CreateUserRequest, HelloResponse, User } from "./models.js";

const PRODUCTION_BASE_URL = "https://api.opsd.sh/v1/";
const ACCEPT = "application/json, application/problem+json";

export interface OpsdClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof globalThis.fetch;
}

/** A client for the public Opsd API. */
export class OpsdClient {
  public readonly baseUrl: string;
  readonly #authorizationHeader: string;
  readonly #fetch: typeof globalThis.fetch;

  public constructor(credential: ApiCredential, options: OpsdClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? PRODUCTION_BASE_URL);
    this.#authorizationHeader = authorizationHeader(credential);
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  public toString(): string {
    return `OpsdClient(baseUrl=${JSON.stringify(this.baseUrl)}, credential=[REDACTED])`;
  }

  public async helloWorld(): Promise<HelloResponse> {
    const response = await this.#request("hello/world");
    return decodeResponse(response, decodeHelloResponse);
  }

  public async helloApplication(): Promise<HelloResponse> {
    const response = await this.#request("hello/application");
    return decodeResponse(response, decodeHelloResponse);
  }

  public async listUsers(): Promise<User[]> {
    const response = await this.#request("test/users");
    return decodeResponse(response, (value) => {
      if (!Array.isArray(value)) {
        throw new TypeError("expected a JSON array");
      }
      return value.map(decodeUser);
    });
  }

  public async createUser(request: CreateUserRequest): Promise<User> {
    const response = await this.#request("test/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return decodeResponse(response, decodeUser);
  }

  async #request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Accept", ACCEPT);
    headers.set("Authorization", this.#authorizationHeader);

    try {
      return await this.#fetch(new URL(path, this.baseUrl), { ...init, headers });
    } catch (cause) {
      throw new TransportError(`request failed: ${errorMessage(cause)}`, { cause });
    }
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch (cause) {
    throw new InvalidBaseUrlError(baseUrl, errorMessage(cause), { cause });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidBaseUrlError(baseUrl, "expected an absolute HTTP or HTTPS URL");
  }
  if (parsed.search || parsed.hash) {
    throw new InvalidBaseUrlError(baseUrl, "query strings and fragments are not allowed");
  }
  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname += "/";
  }
  return parsed.toString();
}

async function decodeResponse<T>(response: Response, decoder: (value: unknown) => T): Promise<T> {
  const body = await response.text();
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch (cause) {
    throw new UnexpectedResponseError(response.status, body, { cause });
  }

  if (response.ok) {
    try {
      return decoder(value);
    } catch (cause) {
      throw new UnexpectedResponseError(response.status, body, { cause });
    }
  }

  try {
    throw new ApiError(response.status, decodeProblemDetails(value));
  } catch (cause) {
    if (cause instanceof ApiError) {
      throw cause;
    }
    throw new UnexpectedResponseError(response.status, body, { cause });
  }
}

function decodeHelloResponse(value: unknown): HelloResponse {
  const data = object(value);
  return { message: string(data, "message") };
}

function decodeUser(value: unknown): User {
  const data = object(value);
  return {
    id: number(data, "id"),
    name: string(data, "name"),
    email: string(data, "email"),
  };
}

function decodeProblemDetails(value: unknown): ProblemDetails {
  const data = object(value);
  return {
    type: string(data, "type"),
    title: string(data, "title"),
    status: number(data, "status"),
    detail: string(data, "detail"),
    category: string(data, "category"),
  };
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("expected a JSON object");
  }
  return value as Record<string, unknown>;
}

function string(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== "string") {
    throw new TypeError(`expected \`${key}\` to be a string`);
  }
  return value;
}

function number(data: Record<string, unknown>, key: string): number {
  const value = data[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(`expected \`${key}\` to be an integer`);
  }
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
