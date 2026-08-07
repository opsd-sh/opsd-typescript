export interface HelloResponse {
  readonly message: string;
}

export interface User {
  readonly id: number;
  readonly name: string;
  readonly email: string;
}

export interface CreateUserRequest {
  readonly name: string;
  readonly email: string;
}
