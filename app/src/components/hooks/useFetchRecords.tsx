import { SourceData } from "@/app/api/importer/[slug]/ImporterDto";
import { useFrontendFetchWithAuth } from "@/lib/frontendFetch";

export type ColumnName = string;
export interface FetchRecordsFilter {
    errors?: "__ALL_COLUMNS__" | ColumnName | null;
}

export function useFetchRecords(importerId: string | null) {
    const frontendFetch = useFrontendFetchWithAuth();
    if (!importerId) {
        return () => [];
    }
    return async (page: number, pageSize: number, filter: FetchRecordsFilter) => {
        return fetchRecords(frontendFetch, importerId, page, pageSize, filter);
    };
}

export async function fetchRecords(
    frontendFetch: ReturnType<typeof useFrontendFetchWithAuth>,
    importerId: string,
    page: number,
    pageSize: number,
    filter: FetchRecordsFilter | null
): Promise<{ recordCount: number; records: SourceData[] }> {
    const searchParams = new URLSearchParams();
    searchParams.append("page", page.toFixed());
    searchParams.append("pageSize", pageSize.toFixed());
    if (filter?.errors) {
        searchParams.append("filterErrorsForColumn", filter.errors);
    }
    const getUrl = `/api/importer/${importerId}/records?${searchParams.toString()}`;
    const result = frontendFetch(getUrl, {
        method: "GET",
        cache: "no-cache",
    }).then((res) => res.json() as Promise<{ recordCount: number; records: SourceData[] }>);
    return await result;
}
