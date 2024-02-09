import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import useSWR from "swr";

export function useGetImporter(
  importerId: string | null,
  pollInterval?: number,
  fallbackData?: ImporterDto
) {
  const { data, error, isLoading, mutate } = useSWR(
    importerId ? [`/api/importer/${importerId}`] : null,
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
    importer: data as ImporterDto,
    error,
    isLoading,
    mutate,
  };
}
