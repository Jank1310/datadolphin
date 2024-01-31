import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { getHost } from "@/lib/utils";
import SidebarMenu from "./SidebarMenu";

type PageProps = {
  params: {
    id: string;
  };
  children: React.ReactNode;
};

export default async function ImporterPage({ params, children }: PageProps) {
  const importerDto = (await fetch(`${getHost()}/api/importer/${params.id}`, {
    cache: "no-cache",
  }).then((res) => res.json())) as ImporterDto;
  return (
    <section className="h-screen flex">
      <SidebarMenu importerDto={importerDto} />
      <main className="h-[100vh] flex-1 w-0">{children}</main>
    </section>
  );
}
