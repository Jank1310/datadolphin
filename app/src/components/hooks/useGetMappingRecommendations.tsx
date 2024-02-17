import { DataMappingRecommendation } from "@/app/api/importer/[slug]/ImporterDto";
import { fetchWithAuth } from "@/lib/frontendFetch";
import { getHost } from "@/lib/utils";
import useSWR from "swr";

export function useGetMappingRecommendations(
  importerId: string | null,
  pollInterval?: number,
  fallbackData?: { recommendations: DataMappingRecommendation[] | null }
) {
  const { data, error, isLoading } = useSWR(
    importerId
      ? [`${getHost()}/api/importer/${importerId}/mappings/recommendations`]
      : null,
    ([url]) => fetchWithAuth(url).then((res) => res.json()),
    {
      refreshInterval: pollInterval,
      fallbackData,
    }
  );
  return {
    recommendations: data.recommendations as DataMappingRecommendation[] | null,
    error,
    isLoading,
  };
}
