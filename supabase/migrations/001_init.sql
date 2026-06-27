-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

create table if not exists deals (
  id bigint generated always as identity primary key,
  source text not null,
  title text not null,
  description text,
  link text unique not null,
  price numeric,
  original_price numeric,
  category text,
  image_url text,
  published_at timestamptz,
  fetched_at timestamptz default now()
);

create table if not exists watchlist (
  id bigint generated always as identity primary key,
  keyword text not null,
  target_price numeric,
  category text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists notifications_log (
  id bigint generated always as identity primary key,
  watchlist_id bigint not null references watchlist(id) on delete cascade,
  deal_id bigint not null references deals(id) on delete cascade,
  sent_at timestamptz default now()
);

create table if not exists settings (
  id bigint generated always as identity primary key,
  notification_email text
);

insert into settings (notification_email)
select null
where not exists (select 1 from settings);

-- Row Level Security: allow anonymous read/write for now (single-user app)
alter table deals enable row level security;
alter table watchlist enable row level security;
alter table notifications_log enable row level security;
alter table settings enable row level security;

create policy "Allow all on deals" on deals for all using (true) with check (true);
create policy "Allow all on watchlist" on watchlist for all using (true) with check (true);
create policy "Allow all on notifications_log" on notifications_log for all using (true) with check (true);
create policy "Allow all on settings" on settings for all using (true) with check (true);

-- Index for faster deal searches
create index if not exists idx_deals_published_at on deals(published_at desc);
create index if not exists idx_deals_link on deals(link);
create index if not exists idx_deals_category on deals(category);
