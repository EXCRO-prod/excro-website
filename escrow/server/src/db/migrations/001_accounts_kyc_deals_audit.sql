-- Milestone 0a: accounts, staff, KYC, parties/deals setup, audit chain, maker-checker.
-- Rules baked into the schema:
--  * audit_events is append-only (trigger) and hash-chained by the application in the same transaction as the change.
--  * No column anywhere holds a full Aadhaar number; only masked last 4 + provider reference.

create table accounts (
  id                 text primary key,
  mobile             text not null unique,
  email              text not null unique,
  mobile_verified_at timestamptz,
  email_verified_at  timestamptz,
  created_at         timestamptz not null
);

create table otp_challenges (
  id          text primary key,
  target      text not null,          -- mobile number or email address
  channel     text not null check (channel in ('mobile', 'email')),
  purpose     text not null check (purpose in ('signup', 'login')),
  code_hash   text not null,
  attempts    int  not null default 0,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null
);
create index otp_target_idx on otp_challenges (target, channel, purpose);

-- Notifier mock: what would have been sent (dev console + simulator read this).
create table mock_outbox (
  id         bigserial primary key,
  channel    text not null,
  to_addr    text not null,
  subject    text not null,
  body       text not null,
  created_at timestamptz not null
);

create table staff_users (
  id         text primary key,
  email      text not null unique,
  name       text not null,
  roles      text[] not null,
  created_at timestamptz not null
);

create table parties (
  id                  text primary key,
  account_id          text not null references accounts (id),
  type                text not null check (type in ('individual', 'company', 'llp', 'partnership', 'proprietorship', 'trust')),
  legal_name          text not null,
  kyc_status          text not null default 'not_started'
                        check (kyc_status in ('not_started', 'in_progress', 'pending_review', 'verified', 'rejected', 'expired')),
  kyc_expires_at      timestamptz,
  pan                 text,
  dob                 date,
  aadhaar_last4       text check (aadhaar_last4 ~ '^[0-9]{4}$'),
  aadhaar_provider_ref text,
  aadhaar_name        text,
  photo_ref           text,
  created_at          timestamptz not null,
  updated_at          timestamptz not null
);
create unique index one_individual_per_account on parties (account_id) where type = 'individual';

create table kyc_checks (
  id           text primary key,
  party_id     text not null references parties (id),
  kind         text not null check (kind in ('pan', 'aadhaar', 'screening')),
  status       text not null check (status in ('pass', 'fail', 'review')),
  detail       jsonb not null default '{}',
  provider_ref text,
  created_at   timestamptz not null
);

create table bank_accounts (
  id             text primary key,
  party_id       text not null references parties (id),
  account_number text not null,
  account_last4  text not null,
  ifsc           text not null,
  holder_name    text,
  status         text not null check (status in ('verified', 'failed')),
  provider_ref   text,
  created_at     timestamptz not null
);

create table maker_checker_requests (
  id          text primary key,
  kind        text not null,
  subject_ref text not null,
  payload     jsonb not null,
  reason_code text not null,
  note        text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  maker_id    text not null references staff_users (id),
  checker_id  text references staff_users (id),
  created_at  timestamptz not null,
  decided_at  timestamptz,
  check (checker_id is null or checker_id <> maker_id)   -- two distinct staff identities, enforced in the database too
);

create table kyc_reviews (
  id                  text primary key,
  party_id            text not null references parties (id),
  risk                text not null check (risk in ('normal', 'high')),
  reasons             jsonb not null,
  status              text not null default 'open' check (status in ('open', 'decided')),
  decision            text check (decision in ('approve', 'reject')),
  maker_checker_id    text references maker_checker_requests (id),
  created_at          timestamptz not null,
  decided_at          timestamptz
);

create sequence deal_seq;

create table deals (
  id                   text primary key,
  tenant_id            text not null default 'direct',
  initiator_account_id text not null references accounts (id),
  status               text not null,
  flow                 text check (flow in ('A', 'B')),
  kyc_gate             text not null check (kyc_gate in ('before_signing', 'before_drafting')),
  parties_locked       boolean not null default false,
  commission           jsonb not null,   -- setup-form commission plan (zero by default), money as decimal strings
  created_at           timestamptz not null,
  updated_at           timestamptz not null
);

create table deal_participants (
  id               text primary key,
  deal_id          text not null references deals (id),
  ref              text not null,
  role             text not null check (role in ('payer', 'payee', 'payer_payee', 'fee_payee', 'verifier', 'observer')),
  label            text not null,
  invitee_mobile   text not null,
  invitee_email    text not null,
  invite_token_hash text not null,
  account_id       text references accounts (id),
  party_id         text references parties (id),
  deposit_share_bps int not null default 0,
  fee_rule         jsonb not null default '{"bps":0,"fixedMinor":"0"}',
  signs            boolean not null,
  sign_order       int not null,
  is_initiator     boolean not null default false,
  joined_at        timestamptz,
  unique (deal_id, ref)
);

create sequence audit_seq;

create table audit_events (
  seq             bigint primary key,
  deal_id         text,
  actor           text not null,
  action          text not null,
  before_hash     text,
  after_hash      text,
  detail          jsonb not null default '{}',
  at              timestamptz not null,
  prev_event_hash text not null,
  event_hash      text not null unique
);
create index audit_deal_idx on audit_events (deal_id, seq);

create function audit_events_immutable() returns trigger as $$
begin
  raise exception 'audit_events is append-only';
end;
$$ language plpgsql;

create trigger audit_events_no_change
  before update or delete on audit_events
  for each row execute function audit_events_immutable();
