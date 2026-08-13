# Opsd TypeScript library

`@opsd/sdk` is the TypeScript and JavaScript client library for the Opsd API. It
provides a small typed wrapper around the current public endpoints, including
the hello-world sandbox route and the user endpoints.

## Installation

```console
npm install @opsd/sdk
```

The package supports Node.js 20 and later, with both ESM and CommonJS builds.
It has no runtime dependencies.

## Usage

The default client targets the production API at `https://api.opsd.sh/v1/`.
OAuth access tokens and API keys both use the HTTP Bearer scheme and are
redacted from object representations.

```typescript
import { ApiCredential, OpsdClient } from "@opsd/sdk";

const credential = new ApiCredential("secret");
const client = new OpsdClient(credential);
const response = await client.helloWorld();

console.log(response.message);
```

For local development, tests, or non-production deployments, pass `baseUrl`
to `OpsdClient`. Successful responses are returned as typed objects. Non-2xx
responses throw `ApiError` when the server returns problem details, or
`UnexpectedResponseError` for an unrecognized response.

API credentials belong in trusted server-side code. Do not expose them in
browser applications.

## Development

```console
npm ci
npm run check
```

## License

Licensed under either the Apache License, Version 2.0 or the MIT license, at
your option.
