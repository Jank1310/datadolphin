import { DataMappingRecommendation } from "@/app/api/importer/[slug]/ImporterDto";
import useSWR from "swr";

export function useGetMappingRecommendations(
  importerId: string | null,
  pollInterval?: number,
  fallbackData?: { recommendations: DataMappingRecommendation[] | null }
) {
  const { data, error, isLoading } = useSWR(
    importerId
      ? [`/api/importer/${importerId}/mappings/recommendations`]
      : null,
    ([url]) =>
      fetch(url, {
        headers: {
          Authorization: process.env.NEXT_PUBLIC_AUTH_TOKEN as string,
        },
      }).then((res) => res.json()),
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
