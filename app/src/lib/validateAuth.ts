import env from "env-var";
import type { NextRequest } from "next/server";

export function validateServerAuth(req: NextRequest): boolean {
	const headers = req.headers;
	const serverAuthToken = env.get("SERVER_AUTH_TOKEN").required().asString();
	const authorization = headers.get("authorization");
	return authorization === `Bearer ${serverAuthToken}`;
}
