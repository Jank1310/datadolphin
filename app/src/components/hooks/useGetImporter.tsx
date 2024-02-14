import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { fetchWithAuth } from "@/lib/frontendFetch";
import useSWR from "swr";

export function useGetImporter(
  importerId: string | null,
  pollInterval?: number,
  fallbackData?: ImporterDto
) {
  const { data, error, isLoading, mutate } = useSWR(
    importerId ? [`/api/importer/${importerId}`] : null,
    ([url]) => fetchWithAuth(url).then((res) => res.json()),
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
