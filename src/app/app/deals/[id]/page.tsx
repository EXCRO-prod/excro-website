import { DealPage } from "@/components/escrow/pages/Deal";

export default async function Page(props: PageProps<"/app/deals/[id]">) {
  const { id } = await props.params;
  return <DealPage id={decodeURIComponent(id)} />;
}
