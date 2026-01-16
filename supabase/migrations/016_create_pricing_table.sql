-- /supabase/migrations/016_create_pricing_table.sql
create extension if not exists "uuid-ossp";

create table if not exists pricing (
  id uuid primary key default uuid_generate_v4(),
  owner_admin_license numeric not null,
  staff_license numeric not null,
  created_at timestamp with time zone default now()
);