export function useFrontendFetchWithAuth() {
    const baseUrl = undefined; // TODO get from context or so
    return async (...args: Parameters<typeof fetch>) => {
        const url = baseUrl ? new URL(args[0] as string, baseUrl) : (args[0] as string);
        return await fetch(url, {
            ...args[1],
            headers: {
                ...args[1]?.headers,
            },
            cache: "no-store",
        });
    };
}
