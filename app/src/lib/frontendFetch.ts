export async function frontendFetchWithAuth(...args: Parameters<typeof fetch>) {
  return await fetch(args[0], {
    ...args[1],
    headers: {
      authorization: "Bearer " + process.env.NEXT_PUBLIC_FRONTEND_TOKEN,
      ...args[1]?.headers,
    },
  });
}
