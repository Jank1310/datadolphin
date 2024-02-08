import { RedirectType, redirect } from "next/navigation";
export default async function ImporterPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`${params.id}/select-file`, RedirectType.replace);
}
