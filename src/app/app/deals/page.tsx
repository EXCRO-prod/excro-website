import { DealsPage } from "@/components/escrow/pages/Deals";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Deals" };

export default function Page() {
  return <DealsPage />;
}
