import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import TranslationsProvider from "@/components/TranslationsProvider";
import { Toaster } from "@/components/ui/toaster";
import { fetchWithAuth } from "@/lib/frontendFetch";
import { getHost } from "@/lib/utils";
import SidebarMenu from "./SidebarMenu";

type PageProps = {
  params: {
    id: string;
    locale: string;
  };
  children: React.ReactNode;
};

export default async function ImporterPage({ params, children }: PageProps) {
  const importerDto = (await fetchWithAuth(
    `${getHost()}/api/importer/${params.id}`,
    {
      cache: "no-cache",
    }
  ).then((res) => res.json())) as ImporterDto;
  return (
    <TranslationsProvider locale={params.locale}>
      <section className="h-screen flex">
        <SidebarMenu importerDto={importerDto} />
        <main className="h-[100vh] flex-1 w-0">{children}</main>
        <Toaster />
      </section>
    </TranslationsProvider>
  );
}
