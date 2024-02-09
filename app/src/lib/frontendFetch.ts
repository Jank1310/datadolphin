import { cloneDeep, set } from "lodash";

export async function fetchWithAuth(...args: Parameters<typeof fetch>) {
  const internalArgs = cloneDeep(args);
  set(
    internalArgs,
    "headers.Authorization",
    "Bearer " + process.env.NEXT_PUBLIC_FRONTEND_TOKEN
  );
  return await fetch(...internalArgs);
}
