import { SiteShell } from "@/components/layout/SiteShell";
import { LegalContent } from "@/components/LegalContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { CONTACT_INFO } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How EXCRO collects, uses, stores, shares, and protects your personal and financial information.",
};

const SECTIONS = [
  { title: "1. Information We Collect", content: `We collect personal information you provide directly, transaction data for escrow services, and technical data such as IP addresses and usage patterns.` },
  { title: "2. How We Use Your Information", content: `We use your information to provide Services, process transactions, verify identity through KYC, communicate with you, and prevent fraud.` },
  { title: "3. Data Storage and Security", content: `Your data is stored in secure, RBI-compliant data centers in India with AES-256 encryption and regular security assessments.` },
  { title: "4. Data Sharing", content: `We may share data with banking partners, trustee entities, KYC providers, and regulators as required by law. We do not sell personal information.` },
  { title: "5. Your Rights", content: `You have the right to access, correct, or delete your data, withdraw consent, and lodge complaints with our Grievance Officer.` },
  { title: "6. Cookies and Tracking", content: `We use cookies to improve experience, analyze usage, and maintain session security.` },
  { title: "7. Data Retention", content: `We retain data as long as necessary for Services and legal obligations including RBI and SEBI requirements.` },
  { title: "8. Children's Privacy", content: `Our Services are not directed to individuals under 18. We do not knowingly collect information from children.` },
  { title: "9. Grievance Redressal", content: `Contact our Grievance Officer at ${CONTACT_INFO.company}, ${CONTACT_INFO.address}. Email: ${CONTACT_INFO.support}. Complaints addressed within 20 days.` },
  { title: "10. Changes to This Policy", content: `We may update this Privacy Policy. Continued use constitutes acceptance of the updated policy.` },
];

export default function PrivacyPage() {
  return (
    <SiteShell>
      <PageHeader
        title="Privacy Policy"
        description="How we protect your privacy and safeguard your personal and financial information."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]}
        pills={["Data protection", "RBI compliant", "Indian data centers"]}
      />
      <LegalContent
        icon="privacy"
        intro="At ESAAS TECHNOLOGIES PVT LTD, we are committed to protecting your privacy. This policy explains how we collect, use, store, and protect your data when you use www.excro.in and our services."
        sections={SECTIONS}
      />
    </SiteShell>
  );
}
