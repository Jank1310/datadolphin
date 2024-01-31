import { DataMappingRecommendation } from "@/app/api/importer/[slug]/ImporterDto";
import useSWR from "swr";

export function useGetMappingRecommendations(
  importerId: string | null,
  pollInterval?: number,
  fallbackData?: DataMappingRecommendation[] | null
) {
  const { data, error, isLoading } = useSWR(
    importerId ? [`/api/importer/${importerId}/mapping/recommendations`] : null,
    ([url]) => fetch(url).then((res) => res.json()),
    {
      refreshInterval: pollInterval,
      fallbackData,
    }
  );
  return {
    recommendations: data as DataMappingRecommendation[],
    error,
    isLoading,
  };
}
