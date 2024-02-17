import TranslationsProvider from "@/components/TranslationsProvider";
import { Toaster } from "@/components/ui/toaster";
import { getImporterManager } from "@/lib/ImporterManager";
import { hexToCssHsl } from "@/lib/utils";
import SidebarMenu from "./SidebarMenu";

type PageProps = {
  params: {
    id: string;
    locale: string;
  };
  children: React.ReactNode;
};

export default async function ImporterPage({ params, children }: PageProps) {
  const importerManager = await getImporterManager();
  const importerDto = await importerManager.getImporterDto(params.id);
  const { primaryColor, primaryForegroundColor } =
    importerDto.config.design ?? {};
  return (
    <TranslationsProvider locale={params.locale}>
      <section
        className="h-screen flex"
        style={
          {
            "--primary": primaryColor ? hexToCssHsl(primaryColor) : undefined,
            "--primary-foreground": primaryForegroundColor
              ? hexToCssHsl(primaryForegroundColor)
              : undefined,
          } as React.CSSProperties
        }
      >
        <SidebarMenu importerDto={importerDto} />
        <main className="h-[100vh] flex-1 w-0">{children}</main>
        <Toaster />
      </section>
    </TranslationsProvider>
  );
}
