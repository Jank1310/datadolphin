import { SourceData } from "@/app/api/importer/[slug]/ImporterDto";
import useSWR from "swr";

export function useGetSourceData(
  importerId: string | null,
  fallbackData?: SourceData[]
) {
  const { data, error, isLoading } = useSWR(
    importerId ? [`/api/importer/${importerId}/validations`] : null,
    ([url]) => fetch(url).then((res) => res.json()),
    {
      fallbackData,
    }
  );
  return {
    data: data as SourceData[],
    error,
    isLoading,
  };
}
