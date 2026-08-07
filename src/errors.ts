/** Base class for errors raised by the Opsd SDK. */
export class OpsdError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class InvalidApiCredentialError extends OpsdError {
  public constructor() {
    super("invalid API credential");
  }
}

export class InvalidBaseUrlError extends OpsdError {
  public readonly baseUrl: string;

  public constructor(baseUrl: string, message: string, options?: ErrorOptions) {
    super(`invalid base URL \`${baseUrl}\`: ${message}`, options);
    this.baseUrl = baseUrl;
  }
}

/** The HTTP request failed before a response was received. */
export class TransportError extends OpsdError {}

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly category: string;
}

export class ApiError extends OpsdError {
  public readonly status: number;
  public readonly problem: ProblemDetails;

  public constructor(status: number, problem: ProblemDetails) {
    super(`API request failed: ${problem.detail}`);
    this.status = status;
    this.problem = problem;
  }
}

export class UnexpectedResponseError extends OpsdError {
  public readonly status: number;
  public readonly body: string;

  public constructor(status: number, body: string, options?: ErrorOptions) {
    super(`API request returned an unexpected response: ${body}`, options);
    this.status = status;
    this.body = body;
  }
}
