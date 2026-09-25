export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, msg: string, detail?: unknown) => new HttpError(400, code, msg, detail);
export const unauthorized = (msg = "sign in required") => new HttpError(401, "unauthorized", msg);
export const forbidden = (code: string, msg: string) => new HttpError(403, code, msg);
export const notFound = (what: string) => new HttpError(404, "not_found", `${what} not found`);
export const conflict = (code: string, msg: string, detail?: unknown) => new HttpError(409, code, msg, detail);
