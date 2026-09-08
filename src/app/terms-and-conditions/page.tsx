import { SiteShell } from "@/components/layout/SiteShell";
import { LegalContent } from "@/components/LegalContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { CONTACT_INFO } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms and conditions governing the use of EXCRO services, APIs, and platforms.",
};

const SECTIONS = [
  { title: "1. Definitions", content: `Access Key & SALT: Confidential keys required to access the Services. API: Application Programming Interfaces and related documentation. Applicable Laws: All laws enforced by UIDAI, RBI, SEBI, or IRDA. Services: Access to APIs and other services specified in your agreement.` },
  { title: "2. Access and Use of Services", content: `We grant you a limited, non-exclusive, non-transferable license to access and use the Services. You shall not reverse engineer, share Access Keys without consent, or use Services for prohibited use cases. You must comply with all Applicable Laws including the Information Technology Act, 2000.` },
  { title: "3. Subscription Plans and Payments", content: `Your access depends on your Subscription Plan. You authorize recurring charges for subscription fees and applicable taxes. All fees are non-refundable unless required by law. Subscriptions auto-renew unless canceled.` },
  { title: "4. Beta Releases and Free Access", content: `Beta or trial versions are provided "as is" without warranties. We may terminate access to Beta Releases or free subscriptions at our discretion.` },
  { title: "5. Intellectual Property", content: `All rights in the Services, APIs, and related intellectual property belong exclusively to us.` },
  { title: "6. Confidentiality", content: `You must protect the confidentiality of Access Keys and login credentials.` },
  { title: "7. Data and Compliance", content: `All data flows through Indian data centers to comply with local regulations. You may only use Services for approved use cases.` },
  { title: "8. Payments and Chargebacks", content: `We settle transaction amounts within two bank working days after transaction completion. You are responsible for end-user disputes.` },
  { title: "9. Liability and Indemnity", content: `We are not liable for consequential damages. You agree to indemnify us against claims from misuse of Services.` },
  { title: "10. Force Majeure", content: `Neither party is liable for delays due to events beyond their control for up to 90 days.` },
  { title: "11. Grievance Redressal", content: `Contact our Grievance Officer at ${CONTACT_INFO.company}, ${CONTACT_INFO.address}. Complaints addressed within 20 days.` },
  { title: "12. Termination", content: `You may cancel at end of term. We may suspend access for non-payment or violation of Terms.` },
  { title: "13. Changes to Terms", content: `We may update Terms at any time. Continued use constitutes acceptance.` },
  { title: "14. Contact Us", content: `For questions, contact ${CONTACT_INFO.company}, ${CONTACT_INFO.address}. Email: ${CONTACT_INFO.support}` },
];

export default function TermsPage() {
  return (
    <SiteShell>
      <PageHeader
        title="Terms and Conditions"
        description="Effective Date: May 30, 2025"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Terms and Conditions" }]}
        pills={["Legal", "ESAAS Technologies", "Updated 2025"]}
      />
      <LegalContent
        icon="terms"
        intro="These Terms govern your use of services, including APIs and platforms, provided by ESAAS TECHNOLOGIES PVT LTD through www.excro.in. By accessing or using our Services, you agree to these Terms."
        sections={SECTIONS}
      />
    </SiteShell>
  );
}
