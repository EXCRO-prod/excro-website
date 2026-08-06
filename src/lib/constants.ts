export const NAV_LINKS = [
  { label: "Solutions", href: "#solutions" },
  { label: "Industries", href: "#industries" },
  { label: "Developers", href: "#developers" },
  { label: "Resources", href: "#faq" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#audit" },
];

export const STATS = [
  { value: 15000, suffix: "+", label: "Transactions Protected" },
  { value: 99.9, suffix: "%", label: "Platform Availability", decimals: 1 },
  { value: 500, prefix: "₹", suffix: " Cr", label: "Transaction Volume" },
  { value: 24, suffix: "×7", label: "Support" },
];

export const TRUST_LOGOS = [
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Razorpay",
  "PayU",
  "PhonePe",
];

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Create Escrow",
    description: "Create transaction and invite all parties to the secure escrow workflow.",
    items: ["Create transaction", "Invite parties"],
  },
  {
    step: 2,
    title: "Funds Stay Protected",
    description: "Money is securely held with milestone tracking until conditions are met.",
    items: ["Money securely held", "Milestone tracking"],
  },
  {
    step: 3,
    title: "Release Funds",
    description: "Automatic settlement, vendor payout, and confirmation when terms are fulfilled.",
    items: ["Automatic settlement", "Vendor payout", "Confirmation"],
  },
];

export const INDUSTRIES = [
  { name: "Marketplace", description: "Secure buyer-seller transactions at scale.", icon: "Store" },
  { name: "Real Estate", description: "Milestone-based property payment releases.", icon: "Building2" },
  { name: "Construction", description: "Project-based fund disbursement control.", icon: "HardHat" },
  { name: "Freelancers", description: "Milestone escrow for remote work payments.", icon: "Laptop" },
  { name: "Healthcare", description: "Compliant payment holds for medical services.", icon: "HeartPulse" },
  { name: "Insurance", description: "Claims and settlement workflow automation.", icon: "ShieldCheck" },
  { name: "Logistics", description: "Delivery-verified vendor payouts.", icon: "Truck" },
  { name: "B2B Commerce", description: "Enterprise trade payment protection.", icon: "Briefcase" },
  { name: "Procurement", description: "Vendor payment controls for sourcing.", icon: "ClipboardList" },
  { name: "Cross Border", description: "Global escrow with compliance built-in.", icon: "Globe" },
];

export const SOLUTIONS = [
  { name: "Digital Escrow", description: "End-to-end digital escrow for any transaction type." },
  { name: "Vendor Escrow", description: "Protect vendor payments until delivery is verified." },
  { name: "Marketplace Escrow", description: "Multi-party escrow for platform marketplaces." },
  { name: "Milestone Escrow", description: "Conditional fund release based on project milestones." },
  { name: "API Integration", description: "Developer-first REST APIs with sandbox testing." },
  { name: "Global Escrow", description: "Cross-border payments with multi-currency support." },
  { name: "Reconciliation", description: "Automated ledger matching and audit trails." },
  { name: "Ledger Management", description: "Centralized transaction tracking and reporting." },
  { name: "Settlement Engine", description: "Automated vendor payout and settlement flows." },
];

export const BENEFITS = [
  { title: "Enterprise Security", description: "Bank-grade encryption, regulated trust accounts, and fraud prevention.", icon: "Shield" },
  { title: "Fast Integration", description: "Go live in days with REST APIs, SDKs, and dedicated onboarding.", icon: "Zap" },
  { title: "API-first Architecture", description: "Programmable escrow core designed for developers and platforms.", icon: "Code2" },
  { title: "Regulatory Ready", description: "KYC/AML compliance, audit logs, and regulatory reporting built-in.", icon: "Scale" },
  { title: "Automated Settlement", description: "Smart release triggers, vendor payouts, and reconciliation.", icon: "RefreshCw" },
  { title: "Dedicated Support", description: "24×7 enterprise support with solution architects on call.", icon: "Headphones" },
];

export const SECURITY_FEATURES = [
  { title: "Encryption", description: "AES-256 encryption at rest and in transit for all financial data.", icon: "Lock" },
  { title: "Compliance", description: "RBI-regulated trust accounts with full KYC/AML compliance.", icon: "FileCheck" },
  { title: "Secure APIs", description: "OAuth 2.0, API keys, rate limiting, and IP whitelisting.", icon: "KeyRound" },
  { title: "Risk Controls", description: "Real-time fraud detection and transaction monitoring.", icon: "AlertTriangle" },
  { title: "Audit Logs", description: "Immutable audit trail for every action and state change.", icon: "ScrollText" },
  { title: "Access Management", description: "Role-based access control with SSO and MFA support.", icon: "Users" },
];

export const FAQ_ITEMS = [
  {
    question: "What is EXCRO and how does escrow work?",
    answer: "EXCRO is an API-powered escrow infrastructure platform. Funds are held in regulated trust accounts until all agreed conditions are met, then automatically released to the right parties.",
  },
  {
    question: "How do I integrate EXCRO APIs?",
    answer: "Use our RESTful APIs and SDKs with comprehensive documentation, sandbox environment, and dedicated developer support. Most integrations go live within days.",
  },
  {
    question: "What integrations are supported?",
    answer: "EXCRO integrates with major payment gateways, banking partners, ERP systems, and custom platforms via webhooks and REST APIs.",
  },
  {
    question: "How does settlement work?",
    answer: "Settlement is automated based on milestone completion or delivery verification. Funds are disbursed to vendors with full reconciliation and confirmation.",
  },
  {
    question: "How is pricing structured?",
    answer: "Pricing is based on transaction volume and platform requirements. Contact our sales team for a custom quote tailored to your business.",
  },
  {
    question: "How secure is the platform?",
    answer: "All funds are held in bank-regulated trust accounts with AES-256 encryption, KYC/AML checks, fraud prevention, and complete audit trails.",
  },
  {
    question: "Is EXCRO compliant with regulations?",
    answer: "Yes. EXCRO is built for regulatory compliance with RBI guidelines, KYC/AML requirements, and enterprise-grade audit and reporting capabilities.",
  },
];

export const AUDIT_BENEFITS = [
  "Free consultation with escrow experts",
  "Complete workflow review and optimization",
  "Compliance and regulatory guidance",
  "Personalized product demo",
];

export const PRODUCT_TABS = [
  "Transactions",
  "Milestones",
  "Wallet",
  "Settlement",
  "Analytics",
  "KYC",
  "Vendor Management",
  "API Logs",
];
