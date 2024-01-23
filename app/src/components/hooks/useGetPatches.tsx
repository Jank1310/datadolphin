import { DataSetPatch } from "@/app/api/importer/[slug]/ImporterDto";
import useSWR from "swr";

export function useGetPatches(
  importerId: string | null,
  pollInterval?: number,
  fallbackData?: DataSetPatch[]
) {
  const { data, error, isLoading } = useSWR(
    importerId ? [`/api/importer/${importerId}/patches`] : null,
    ([url]) => fetch(url).then((res) => res.json()),
    {
      refreshInterval: pollInterval,
      fallbackData,
    }
  );
  return {
    patches: data as DataSetPatch[],
    error,
    isLoading,
  };
}
