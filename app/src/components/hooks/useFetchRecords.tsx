import { SourceData } from "@/app/api/importer/[slug]/ImporterDto";
import { useFrontendFetchWithAuth } from "@/lib/frontendFetch";

export function useFetchRecords(importerId: string | null) {
    const frontendFetch = useFrontendFetchWithAuth();
    if (!importerId) {
        return () => [];
    }
    return async (page: number, pageSize: number) => {
        return fetchRecords(frontendFetch, importerId, page, pageSize);
    };
}

export async function fetchRecords(
    frontendFetch: ReturnType<typeof useFrontendFetchWithAuth>,
    importerId: string,
    page: number,
    pageSize: number
): Promise<SourceData[]> {
    const searchParams = new URLSearchParams();
    searchParams.append("page", page.toFixed());
    searchParams.append("pageSize", pageSize.toFixed());
    const getUrl = `/api/importer/${importerId}/records?${searchParams.toString()}`;
    const result = frontendFetch(getUrl, {
        method: "GET",
        cache: "no-cache",
    }).then((res) => res.json() as Promise<{ records: SourceData[] }>);
    return (await result).records;
}
