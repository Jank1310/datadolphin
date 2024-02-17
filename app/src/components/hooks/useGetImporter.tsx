import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { useFrontendFetchWithAuth } from "@/lib/frontendFetch";
import { getHost } from "@/lib/utils";
import useSWR from "swr";

export function useGetImporter(
  importerId: string | null,
  pollInterval?: number,
  fallbackData?: ImporterDto
) {
  const frontendFetch = useFrontendFetchWithAuth();
  const { data, error, isLoading, mutate } = useSWR(
    importerId ? [`${getHost()}/api/importer/${importerId}`] : null,
    ([url]) => frontendFetch(url).then((res) => res.json()),
    {
      refreshInterval: pollInterval,
      fallbackData,
    }
  );
  return {
    importer: data as ImporterDto,
    error,
    isLoading,
    mutate,
  };
}
