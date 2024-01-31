import { DataValidation } from "@/app/api/importer/[slug]/ImporterDto";
import useSWR from "swr";

export function useGetValidations(
  importerId: string | null,
  pollInterval?: number,
  fallbackData?: DataValidation[]
) {
  const { data, error, isLoading } = useSWR(
    importerId ? [`/api/importer/${importerId}/validations`] : null,
    ([url]) => fetch(url).then((res) => res.json()),
    {
      refreshInterval: pollInterval,
      fallbackData,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnMount: false,
      revalidateOnReconnect: false,
    }
  );
  return {
    validations: data as DataValidation[],
    error,
    isLoading,
  };
}
