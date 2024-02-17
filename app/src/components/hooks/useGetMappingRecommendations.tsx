import { DataMappingRecommendation } from "@/app/api/importer/[slug]/ImporterDto";
import { useFrontendFetchWithAuth } from "@/lib/frontendFetch";
import { getHost } from "@/lib/utils";
import useSWR from "swr";

export function useGetMappingRecommendations(
  importerId: string | null,
  pollInterval?: number,
  fallbackData?: { recommendations: DataMappingRecommendation[] | null }
) {
  const frontendFetch = useFrontendFetchWithAuth();
  const { data, error, isLoading } = useSWR(
    importerId
      ? [`${getHost()}/api/importer/${importerId}/mappings/recommendations`]
      : null,
    ([url]) => frontendFetch(url).then((res) => res.json()),
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
