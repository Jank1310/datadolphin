import env from "env-var";
import { NextRequest } from "next/server";

export function validateAuth(req: NextRequest): boolean {
  const headers = req.headers;
  const authorization = headers.get("authorization");
  const frontendToken = env
    .get("NEXT_PUBLIC_FRONTEND_TOKEN")
    .required()
    .asString();
  if (authorization !== `Bearer ${frontendToken}`) {
    return false;
  }
  return true;
}

export function validateServerAuth(req: NextRequest): boolean {
  const headers = req.headers;
  const serverAuthToken = env.get("SERVER_AUTH_TOKEN").required().asString();
  const authorization = headers.get("authorization");
  if (authorization !== `Bearer ${serverAuthToken}`) {
    return false;
  }
  return true;
}
