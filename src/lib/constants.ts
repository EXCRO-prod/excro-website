export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Our Services", href: "/our-services" },
  { label: "API Powered Escrow", href: "/api-powered-escrow" },
  { label: "Contact", href: "/contact" },
];

export const CONTACT_INFO = {
  company: "ESAAS Technologies Private Limited",
  address:
    "2nd Floor, WeWork Salarpuria Symbiosis, Bannerghatta Road, Arekere Village, Bengaluru, Karnataka 560076",
  phone: "+91-9538733737",
  whatsapp: "919538733737",
  whatsappDefaultMessage:
    "Hi EXCRO team, I'd like to learn more about your escrow services.",
  sales: "sales@excro.in",
  support: "support@excro.in",
  partnerships: "partnerships@excro.in",
};

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

export const ESCROW_PROBLEMS = [
  "Advance payment fraud — Buyer pays, seller disappears",
  "Unverified delivery — Incomplete or faulty product/service",
  "Scope changes — Under-delivery or overcharging",
  "Contract breaches — Failure to meet terms",
  "Cross-border risks — Legal or currency issues",
];

export const ESCROW_SOLUTIONS = [
  "Neutral fund holding until terms are fulfilled",
  "Conditional release based on delivery/milestones",
  "Dispute resolution with mediation support",
  "Complete audit trail for transparency",
  "Ideal for freelancers, real estate, B2B, and more",
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

export const SERVICES_DETAILED = [
  {
    slug: "saas-platforms",
    title: "SaaS Platforms",
    description:
      "SaaS platform with APIs for banks and financial institutions, enabling end-to-end escrow operations management. From account opening to complete account lifecycle management, Excro ensures secure handling of funds with full transparency between banks and their clients.",
    icon: "Cloud",
    image:
      "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&auto=format&fit=crop&q=80",
  },
  {
    slug: "connected-banking",
    title: "Connected Banking",
    description:
      "Connect seamlessly with partner banks through secure APIs for real-time account aggregation, payment initiation, balance checks, and automated fund flows. Enable open-banking integrations that power escrow collections, settlements, and reconciliation without manual intervention.",
    icon: "Landmark",
    image:
      "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800&auto=format&fit=crop&q=80",
  },
  {
    slug: "kyc-validation",
    title: "KYC Validation",
    description:
      "Complete KYC verification services help businesses streamline customer onboarding while ensuring authenticity and security at every step. We follow stringent regulatory guidelines to maintain full compliance with industry standards.",
    icon: "UserCheck",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop&q=80",
  },
  {
    slug: "ledger-management",
    title: "Ledger Management",
    description:
      "Track every debit, credit, and balance in real-time, mapped across customers, vendors, and escrow accounts. With support for custom chart of accounts and API-based integration for full visibility into money flows.",
    icon: "BookOpen",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
  },
  {
    slug: "vendor-payouts",
    title: "Vendor Payouts",
    description:
      "Simplify vendor and supplier payments through escrow-powered payout systems. Funds are only released upon fulfillment of pre-defined milestones, with support for one-time, recurring, and bulk payouts.",
    icon: "Wallet",
    image:
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80",
  },
  {
    slug: "reconciliations",
    title: "Reconciliations",
    description:
      "Hold funds securely between transacting parties until all conditions are met. Ideal for online marketplaces, high-value transactions, and service-based engagements with customizable milestones.",
    icon: "RefreshCw",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
  },
  {
    slug: "global-escrows",
    title: "Global Escrows",
    description:
      "Whether dealing with international suppliers, freelancers, or B2B deals, Global Escrows ensure cross-border transactions remain secure, compliant, and frictionless with multi-currency support.",
    icon: "Globe",
    image:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=80",
  },
];

export const SERVICE_NAV_ITEMS = SERVICES_DETAILED.map((service) => ({
  label: service.title,
  href: `/our-services#${service.slug}`,
  description: service.description.split(".")[0] + ".",
  icon: service.icon,
}));

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
  { title: "Trusted by Design", description: "Funds are held securely until all conditions are met. No early releases. No risks.", icon: "Shield" },
  { title: "Fast & Transparent", description: "Real-time transaction status, instant notifications, and complete audit trails.", icon: "Zap" },
  { title: "Seamless API Integration", description: "Easily plug into your app or workflow with developer-first REST APIs.", icon: "Code2" },
  { title: "Dispute Protection", description: "Built-in mediation and structured release workflows reduce disputes and chargebacks.", icon: "Scale" },
  { title: "Global-Ready", description: "Multi-currency, cross-border escrow support with full KYC & compliance.", icon: "Globe" },
  { title: "Insightful Dashboard", description: "Manage all your transactions, milestones, and parties in one clean interface.", icon: "LayoutDashboard" },
];

export const SECURITY_FEATURES = [
  { title: "Encryption", description: "AES-256 encryption at rest and in transit for all financial data.", icon: "Lock" },
  { title: "Compliance", description: "RBI-regulated trust accounts with full KYC/AML compliance.", icon: "FileCheck" },
  { title: "Secure APIs", description: "OAuth 2.0, API keys, rate limiting, and IP whitelisting.", icon: "KeyRound" },
  { title: "Risk Controls", description: "Real-time fraud detection and transaction monitoring.", icon: "AlertTriangle" },
  { title: "Audit Logs", description: "Immutable audit trail for every action and state change.", icon: "ScrollText" },
  { title: "Access Management", description: "Role-based access control with SSO and MFA support.", icon: "Users" },
];

export const ESCROW_ADVANTAGES = [
  {
    advantage: "Faster Processing",
    description: "Eliminates paperwork and enables instant submissions with automation, reducing transaction times from weeks to days.",
    help: "Bundle API Powered Escrow with instant client onboarding for complete KYC compliance.",
  },
  {
    advantage: "Greater Convenience",
    description: "Allows 24/7 access via mobile/desktop from anywhere, without physical visits or business hour restrictions.",
    help: "Mobile and desktop friendly applications with APIs for B2B client integration.",
  },
  {
    advantage: "Cost Savings",
    description: "Reduces fees by minimizing printing, mailing, and administrative overhead compared to manual processes.",
    help: "Everything handled digitally, including client onboarding, KYC checks, and agreement signing.",
  },
  {
    advantage: "Enhanced Security",
    description: "Features like encryption, 2FA, and third-party holding prevent tampering and scams more effectively.",
    help: "Account whitelisting and 2FA features for enhanced security.",
  },
  {
    advantage: "Real-Time Tracking",
    description: "Dashboards and notifications provide ongoing updates, unlike delayed reporting in traditional setups.",
    help: "Account level dashboard with user controls for managing each account.",
  },
  {
    advantage: "Streamlined Compliance",
    description: "Instant KYC via Aadhaar or video speeds up checks, ensuring regulatory adherence without manual delays.",
    help: "Bundles escrow with AML, KYC Management, Compliance and STR ready reports.",
  },
];

export const ESCROW_SCOPE = [
  { title: "Marketplace Transactions", description: "Holds buyer payments until sellers deliver goods; common in platforms for electronics, luxury items, and collectibles.", icon: "ShoppingBag" },
  { title: "Real Estate & Property", description: "Manages deposits for property purchases or rentals, ensuring funds are released only after title transfers or inspections.", icon: "Building2" },
  { title: "Investments & Crowdfunding", description: "Secures investor funds until milestones (e.g., project completion) are achieved, protecting against misuse.", icon: "TrendingUp" },
  { title: "Freelance & Services", description: "Secures payments for services like consulting or development until client approval.", icon: "Laptop" },
];

export const TRUSTEE_ENTITIES = [
  { type: "Scheduled Commercial Banks", basis: "RBI Master Directions on Escrow Accounts", criteria: "RBI-licensed; segregated escrow accounts; KYC/AML compliance.", examples: "HDFC Bank, ICICI Bank, State Bank of India" },
  { type: "SEBI-Registered Trustees", basis: "SEBI Debenture Trustees Regulations", criteria: "SEBI registration; minimum net worth of ₹10 crore; compliance officer.", examples: "Axis Trustee Services, Mitcon Credentia, Universal Trusteeship" },
  { type: "NBFCs", basis: "RBI Guidelines for Digital Lending", criteria: "RBI registration as NBFC; association with scheduled bank for escrow holding.", examples: "Bajaj Finance, Tata Capital" },
];

export const FAQ_ITEMS = [
  {
    question: "What is EXCRO and how does escrow work?",
    answer: "EXCRO is an API-powered escrow infrastructure platform. Funds are held in regulated trust accounts until all agreed conditions are met, then automatically released to the right parties.",
  },
  {
    question: "Who can use EXCRO's escrow services?",
    answer: "Our platform is designed for freelancers, businesses, marketplaces, real estate companies, digital asset traders, and any organization looking to secure payments.",
  },
  {
    question: "Is my money safe with EXCRO?",
    answer: "Absolutely. All funds are held in bank-regulated trust accounts with bank-grade encryption, KYC/AML checks, fraud prevention, and complete audit trails.",
  },
  {
    question: "How can I integrate EXCRO with my business?",
    answer: "Use our RESTful APIs and SDKs with comprehensive documentation, sandbox environment, and dedicated developer support. Most integrations go live within days.",
  },
  {
    question: "How does settlement work?",
    answer: "Settlement is automated based on milestone completion or delivery verification. Funds are disbursed to vendors with full reconciliation and confirmation.",
  },
  {
    question: "How is pricing structured?",
    answer: "Pricing is based on transaction volume and platform requirements. Contact our sales team for a custom quote tailored to your business.",
  },
];

export const CONTACT_SUBJECTS = [
  "Escrow account services",
  "SaaS platform",
  "Virtual account services",
  "Payment gateway integration",
  "PG integration services",
  "Other",
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
