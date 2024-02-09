import { NextRequest } from "next/server";

export function validateAuth(req: NextRequest): boolean {
  const headers = req.headers;
  const authorization = headers.get("authorization");
  if (
    !authorization ||
    authorization !== process.env.NEXT_PUBLIC_FRONTEND_TOKEN
  ) {
    return false;
  }
  return true;
}
