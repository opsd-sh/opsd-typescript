import { describe, expect, it } from "vitest";
import {
  ApiCredential,
  ApiError,
  InvalidBaseUrlError,
  OpsdClient,
  TransportError,
  UnexpectedResponseError,
} from "../src/index.js";

describe("OpsdClient", () => {
  it("defaults to production and redacts the credential", () => {
    const client = new OpsdClient(new ApiCredential("secret-access-token"));

    expect(client.baseUrl).toBe("https://api.opsd.sh/v1/");
    expect(client.toString()).not.toContain("secret-access-token");
  });

  it("normalizes an existing base path", () => {
    const client = new OpsdClient(new ApiCredential("token"), {
      baseUrl: "https://example.test/v1",
    });

    expect(client.baseUrl).toBe("https://example.test/v1/");
  });

  it.each(["relative/path", "ftp://example.test/v1", "https://example.test/v1?tenant=one"])(
    "rejects invalid base URL %s",
    (baseUrl) => {
      expect(() => new OpsdClient(new ApiCredential("token"), { baseUrl })).toThrow(
        InvalidBaseUrlError,
      );
    },
  );

  it("authenticates and decodes the hello endpoint", async () => {
    const fetch: typeof globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      expect(request.url).toBe("https://example.test/v1/hello/world");
      expect(request.headers.get("Authorization")).toBe("Bearer secret");
      expect(request.headers.get("Accept")).toBe("application/json, application/problem+json");
      return Response.json({ message: "hello" });
    };
    const client = new OpsdClient(new ApiCredential("secret"), {
      baseUrl: "https://example.test/v1/",
      fetch,
    });

    await expect(client.helloWorld()).resolves.toEqual({ message: "hello" });
  });

  it("uses the expected endpoint paths and models", async () => {
    const requests: Request[] = [];
    const fetch: typeof globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      if (request.url.endsWith("/hello/application")) {
        return Response.json({ message: "application" });
      }
      if (request.method === "GET") {
        return Response.json([{ id: 1, name: "Ada", email: "ada@example.test" }]);
      }
      return Response.json({ id: 2, name: "Grace", email: "grace@example.test" }, { status: 201 });
    };
    const client = new OpsdClient(new ApiCredential("secret"), {
      baseUrl: "https://example.test/v1/",
      fetch,
    });

    await expect(client.helloApplication()).resolves.toEqual({ message: "application" });
    await expect(client.listUsers()).resolves.toEqual([
      { id: 1, name: "Ada", email: "ada@example.test" },
    ]);
    await expect(
      client.createUser({ name: "Grace", email: "grace@example.test" }),
    ).resolves.toEqual({ id: 2, name: "Grace", email: "grace@example.test" });

    expect(requests.map(({ method, url }) => [method, new URL(url).pathname])).toEqual([
      ["GET", "/v1/hello/application"],
      ["GET", "/v1/test/users"],
      ["POST", "/v1/test/users"],
    ]);
    await expect(requests.at(-1)?.json()).resolves.toEqual({
      name: "Grace",
      email: "grace@example.test",
    });
  });

  it("exposes problem details on API errors", async () => {
    const fetch: typeof globalThis.fetch = async () =>
      Response.json(
        {
          type: "https://api.opsd.sh/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "no route found",
          category: "request",
        },
        { status: 404 },
      );
    const client = new OpsdClient(new ApiCredential("secret"), { fetch });

    const error = await client.helloWorld().catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      problem: {
        type: "https://api.opsd.sh/problems/not-found",
        detail: "no route found",
      },
    });
  });

  it("preserves unrecognized responses", async () => {
    const fetch: typeof globalThis.fetch = async () => new Response("bad gateway", { status: 502 });
    const client = new OpsdClient(new ApiCredential("secret"), { fetch });

    const error = await client.helloWorld().catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(UnexpectedResponseError);
    expect(error).toMatchObject({ status: 502, body: "bad gateway" });
  });

  it("wraps transport errors", async () => {
    const fetch: typeof globalThis.fetch = async () => {
      throw new Error("connection refused");
    };
    const client = new OpsdClient(new ApiCredential("secret"), { fetch });

    await expect(client.helloWorld()).rejects.toThrow(TransportError);
    await expect(client.helloWorld()).rejects.toThrow("connection refused");
  });
});
