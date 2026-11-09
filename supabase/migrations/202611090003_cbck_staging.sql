-- CAMUM v0.21 / CBCK source staging ONLY; never publish or activate a directory-listed institution automatically.
-- This migration is for the development Supabase project after 0001 and 0002.
begin;

create table if not exists camum_private.cbck_directory_staging (
  source_record_id text primary key check (length(source_record_id) between 4 and 120),
  cbck_code text not null default '',
  source_section text not null check
    (source_section in ('male_all','female_all','retreat_house','male_head','female_head')),
  official_name text not null check (length(official_name) between 2 and 200),
  source_context text not null default '',
  official_detail_url text not null default '',
  source_checked_on date not null,
  provisional_management_number text,
  provisional_facility_number text,
  organization_id uuid references public.organizations(id) on delete set null,
  retreat_house_id uuid references public.retreat_houses(id) on delete set null,
  review_state text not null default 'unreviewed'
    check (review_state in ('unreviewed','duplicate_review','affiliation_review','verified','rejected')),
  claim_state text not null default 'unclaimed'
    check (claim_state in ('unclaimed','invited','claimed')),
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (provisional_management_number is null or source_section in ('male_head','female_head')),
  check (provisional_facility_number is null or source_section = 'retreat_house'),
  check (not (provisional_management_number is not null and provisional_facility_number is not null)),
  check (provisional_management_number is null or provisional_management_number ~ '^CAM-[0-9]{6}$'),
  check (provisional_facility_number is null or provisional_facility_number ~ '^CAM-H-[0-9]{6}$')
);

create unique index if not exists cbck_provisional_org_unique
 on camum_private.cbck_directory_staging(provisional_management_number)
 where provisional_management_number is not null;
create unique index if not exists cbck_provisional_house_unique
 on camum_private.cbck_directory_staging(provisional_facility_number)
 where provisional_facility_number is not null;
create index if not exists cbck_source_code_idx
 on camum_private.cbck_directory_staging(cbck_code);
create index if not exists cbck_review_state_idx
 on camum_private.cbck_directory_staging(review_state, source_section);

alter table camum_private.cbck_directory_staging enable row level security;
revoke all on camum_private.cbck_directory_staging from public, anon, authenticated;
-- No user-facing RLS policy. Only a trusted, audited operator or server import can stage the source.
-- Do NOT create a general anon/authenticated SELECT policy here.
-- Do NOT create institution passwords on preload. Actual management_number enters organizations
-- only after legal-entity deduplication, verified institutional claim, and sequence synchronization.
commit;
