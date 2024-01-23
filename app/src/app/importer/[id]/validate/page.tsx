import { ImporterDto } from "@/app/api/importer/[slug]/ImporterDto";
import { getHost } from "@/lib/utils";
import Validation from "./Validation";

export default async function page(props: { params: { id: string } }) {
  const importerId = props.params.id;
  const initialImporterDto = (await fetch(
    `${getHost()}/api/importer/${importerId}`,
    {
      cache: "no-cache",
    }
  ).then((res) => res.json())) as ImporterDto;
  return (
    <div className="p-4">
      <Validation initialImporterDto={initialImporterDto} />
    </div>
  );
}