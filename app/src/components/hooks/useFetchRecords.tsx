import { SourceData } from "@/app/api/importer/[slug]/ImporterDto";
import { getHost } from "@/lib/utils";

export function useFetchRecords(importerId: string | null) {
  if (!importerId) {
    return () => [];
  }
  return async (page: number, pageSize: number) => {
    return fetchRecords(importerId, page, pageSize);
  };
}

export async function fetchRecords(
  importerId: string,
  page: number,
  pageSize: number
): Promise<SourceData[]> {
  const getUrl = new URL(`/api/importer/${importerId}/records`, getHost());
  getUrl.searchParams.append("page", page.toFixed());
  getUrl.searchParams.append("pageSize", pageSize.toFixed());
  const result = fetch(getUrl, {
    method: "GET",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json() as Promise<{ records: SourceData[] }>);
  return (await result).records;
}
