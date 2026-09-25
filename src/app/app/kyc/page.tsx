import { KycPage } from "@/components/escrow/pages/Kyc";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My KYC" };

export default function Page() {
  return <KycPage />;
}
