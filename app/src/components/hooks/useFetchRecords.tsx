import { SourceData } from "@/app/api/importer/[slug]/ImporterDto";
import { useFrontendFetchWithAuth } from "@/lib/frontendFetch";

export function useFetchRecords(importerId: string | null) {
    const frontendFetch = useFrontendFetchWithAuth();
    if (!importerId) {
        return () => [];
    }
    return async (page: number, pageSize: number, filterErrorsForColumn: string | null) => {
        return fetchRecords(frontendFetch, importerId, page, pageSize, filterErrorsForColumn);
    };
}

export async function fetchRecords(
    frontendFetch: ReturnType<typeof useFrontendFetchWithAuth>,
    importerId: string,
    page: number,
    pageSize: number,
    filterErrorsForColumn: string | null
): Promise<{ recordCount: number; records: SourceData[] }> {
    const searchParams = new URLSearchParams();
    searchParams.append("page", page.toFixed());
    searchParams.append("pageSize", pageSize.toFixed());
    if (filterErrorsForColumn) {
        searchParams.append("filterErrorsForColumn", filterErrorsForColumn);
    }
    const getUrl = `/api/importer/${importerId}/records?${searchParams.toString()}`;
    const result = frontendFetch(getUrl, {
        method: "GET",
        cache: "no-cache",
    }).then((res) => res.json() as Promise<{ recordCount: number; records: SourceData[] }>);
    return await result;
}
