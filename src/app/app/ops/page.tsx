import { OpsPage } from "@/components/escrow/pages/Ops";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ops console" };

export default function Page() {
  return <OpsPage />;
}
