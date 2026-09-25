-- Milestone 0b: entity KYC (company/LLP/partnership/proprietorship/trust), spec 13.
-- Documents are never stored as real files here (mock mode): kyc_documents.reference is an
-- opaque pointer, never file bytes; the real adapter later stores them encrypted, ops-only.

alter table kyc_checks drop constraint kyc_checks_kind_check;
alter table kyc_checks add constraint kyc_checks_kind_check check (kind in ('pan', 'aadhaar', 'screening', 'gstin', 'mca'));

create table entity_details (
  party_id                text primary key references parties (id),
  gst_registered          boolean not null,
  gstin                   text,
  reg_no                  text,               -- CIN / LLPIN / trust registration number
  reg_no_type             text check (reg_no_type in ('CIN', 'LLPIN', 'registration')),
  -- The individual who signs for this entity. Always required, including proprietorships
  -- (where the signatory is the proprietor themselves). Their own individual KYC is separate.
  signatory_party_id      text not null references parties (id),
  beneficial_owners_declared boolean not null default false,
  created_at              timestamptz not null,
  updated_at              timestamptz not null
);

create table beneficial_owners (
  id         text primary key,
  party_id   text not null references parties (id),  -- the entity
  full_name  text not null,
  pan        text not null,
  share_pct  numeric(5,2) not null check (share_pct >= 10 and share_pct <= 100),
  created_at timestamptz not null
);
create index beneficial_owners_party_idx on beneficial_owners (party_id);

create table kyc_documents (
  id          text primary key,
  party_id    text not null references parties (id),
  kind        text not null,
  reference   text not null,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text references staff_users (id),
  created_at  timestamptz not null,
  reviewed_at timestamptz
);
create index kyc_documents_party_idx on kyc_documents (party_id);
