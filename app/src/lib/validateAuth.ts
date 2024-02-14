import env from "env-var";
import { NextRequest } from "next/server";

export function validateAuth(req: NextRequest): boolean {
  const headers = req.headers;
  const authorization = headers.get("authorization");
  const frontendToken = env
    .get("NEXT_PUBLIC_FRONTEND_TOKEN")
    .required()
    .asString();
  return authorization === `Bearer ${frontendToken}`;
}

export function validateServerAuth(req: NextRequest): boolean {
  const headers = req.headers;
  const serverAuthToken = env.get("SERVER_AUTH_TOKEN").required().asString();
  const authorization = headers.get("authorization");
  return authorization === `Bearer ${serverAuthToken}`;
}
