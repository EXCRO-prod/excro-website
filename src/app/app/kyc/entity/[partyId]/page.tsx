import { EntityKycPage } from "@/components/escrow/pages/EntityKyc";

export default async function Page(props: PageProps<"/app/kyc/entity/[partyId]">) {
  const { partyId } = await props.params;
  return <EntityKycPage partyId={partyId} />;
}
