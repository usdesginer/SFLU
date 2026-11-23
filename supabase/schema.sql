-- ==============================================================================
-- FarmIQ Supabase Schema: Zero-Auth Persistent Hub keyed by Farm ID
-- ==============================================================================
-- No registration or sign-in required.
-- Sunflower Land Farm ID is the primary identity key throughout FarmIQ.
-- ==============================================================================

-- 1. Farm Snapshots: Tracks net worth, inventory valuation, and XP growth over time
create table if not exists public.farm_snapshots (
  id uuid primary key default gen_random_uuid(),
  farm_id text not null,
  level int not null default 1,
  bumpkin_xp int not null default 0,
  sfl_balance numeric(18, 4) not null default 0,
  coins_balance numeric(18, 4) not null default 0,
  total_valuation_sfl numeric(18, 4) not null default 0,
  total_valuation_usd numeric(18, 4) not null default 0,
  inventory_summary jsonb default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

-- Index for speedy chronological lookups by farm
create index if not exists idx_farm_snapshots_farm_id on public.farm_snapshots(farm_id, recorded_at desc);

-- 2. Farm Watchlists & Price Target Alerts: Persists custom buy/sell triggers
create table if not exists public.farm_watchlists (
  id text primary key,
  farm_id text not null,
  item_id text not null,
  item_name text not null,
  target_price numeric(18, 4) not null,
  condition text not null check (condition in ('above', 'below')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_farm_watchlists_farm_id on public.farm_watchlists(farm_id);

-- 3. Farm Daily Missions Progress: Persists completed recommendations
create table if not exists public.farm_missions (
  id text primary key,
  farm_id text not null,
  mission_date text not null, -- YYYY-MM-DD
  mission_id text not null,
  completed boolean not null default false,
  completed_at timestamptz not null default now()
);

create index if not exists idx_farm_missions_farm_date on public.farm_missions(farm_id, mission_date);

-- 4. Farm Settings & Preferences
create table if not exists public.farm_settings (
  farm_id text primary key,
  telegram_chat_id text,
  push_enabled boolean default false,
  preferred_currency text default 'USD',
  last_active_at timestamptz default now()
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- Public access enabled for client reads & writes keyed to Farm ID (Zero-Auth)
-- ==============================================================================
alter table public.farm_snapshots enable row level security;
alter table public.farm_watchlists enable row level security;
alter table public.farm_missions enable row level security;
alter table public.farm_settings enable row level security;

-- Policies for farm_snapshots
create policy "Allow public read of farm_snapshots" on public.farm_snapshots
  for select using (true);

create policy "Allow public insert of farm_snapshots" on public.farm_snapshots
  for insert with check (true);

-- Policies for farm_watchlists
create policy "Allow public read of farm_watchlists" on public.farm_watchlists
  for select using (true);

create policy "Allow public insert/update/delete of farm_watchlists" on public.farm_watchlists
  for all using (true) with check (true);

-- Policies for farm_missions
create policy "Allow public read of farm_missions" on public.farm_missions
  for select using (true);

create policy "Allow public insert/update of farm_missions" on public.farm_missions
  for all using (true) with check (true);

-- Policies for farm_settings
create policy "Allow public read and write of farm_settings" on public.farm_settings
  for all using (true) with check (true);

-- 5. Marketplace Price Snapshots: Records item price, order book depth & volume points for multi-window trending
create table if not exists public.marketplace_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  item_name text,
  price_flower numeric(18, 6) not null,
  price_usd numeric(18, 6) not null,
  floor_ask numeric(18, 6),
  best_bid numeric(18, 6),
  last_sale numeric(18, 6),
  currency text default 'FLOWER',
  unit text default 'per_item',
  source text default 'community_api',
  volume_24h numeric(18, 2) default 0,
  trades_24h int default 0,
  recorded_at timestamptz not null default now()
);

-- Ensure backwards-compatible column additions for existing tables
alter table public.marketplace_price_snapshots add column if not exists item_name text;
alter table public.marketplace_price_snapshots add column if not exists floor_ask numeric(18, 6);
alter table public.marketplace_price_snapshots add column if not exists best_bid numeric(18, 6);
alter table public.marketplace_price_snapshots add column if not exists last_sale numeric(18, 6);
alter table public.marketplace_price_snapshots add column if not exists currency text default 'FLOWER';
alter table public.marketplace_price_snapshots add column if not exists unit text default 'per_item';
alter table public.marketplace_price_snapshots add column if not exists source text default 'community_api';

create index if not exists idx_market_snapshots_item on public.marketplace_price_snapshots(item_id, recorded_at desc);

alter table public.marketplace_price_snapshots enable row level security;
create policy "Allow public read of marketplace_price_snapshots" on public.marketplace_price_snapshots
  for select using (true);
create policy "Allow public insert of marketplace_price_snapshots" on public.marketplace_price_snapshots
  for insert with check (true);

-- ==============================================================================
-- 6. Recursive Resource Cost Engine (RRCE) Schema:
--    production_recipes, production_recipe_inputs, and farm_skill_modifiers
-- ==============================================================================

-- 6A. Central Production Recipes Table
-- Separates tradeability, production type, and economic utility as distinct properties.
-- Official SFL Policy: Cooking buildings (Fire Pit, Kitchen, Bakery, Deli, Smoothie Shack) charge zero FLOWER fees for cooking time (0.0000 FLOWER).
create table if not exists public.production_recipes (
  recipe_id text primary key,
  output_item_id text not null,
  output_quantity numeric(18, 4) not null default 1,
  required_building text not null,
  production_duration int not null default 0,      -- Duration in minutes (0 if instant)
  time_type text not null default 'Processing',    -- 'Instant' | 'Active' | 'Processing' | 'Passive' | 'Cooldown'
  active_interaction_minutes int not null default 0,
  processing_duration_minutes int not null default 0,
  passive_duration_minutes int not null default 0,
  cooldown_duration_minutes int not null default 0,
  cooking_time_fee_flower numeric(12, 4) not null default 0.0000,   -- Strictly 0.0000 FLOWER in Sunflower Land
  default_capacity_rate_flower numeric(12, 4) not null default 0.0000,
  is_instant boolean not null default false,
  is_tradeable_output boolean not null default false,
  output_type text not null,                       -- 'resource' | 'tool' | 'food' | 'crop' | 'animal_product' | 'craftable'
  economic_category text not null default 'CATEGORY_1_TRADEABLE_RESOURCE',
  economic_utility text[] not null default '{}',   -- e.g. ARRAY['market_value', 'production_profit', 'xp_utility', 'time_cost']
  xp_reward numeric(18, 2) not null default 0,
  recipe_version text not null default 'v2.4-official-sfl',
  updated_at timestamptz not null default now()
);

create index if not exists idx_production_recipes_output on public.production_recipes(output_item_id);

-- 6B. Production Recipe Inputs Table (Supports recursive dependency traversal)
create table if not exists public.production_recipe_inputs (
  id uuid primary key default gen_random_uuid(),
  recipe_id text not null references public.production_recipes(recipe_id) on delete cascade,
  input_item_id text not null,                     -- e.g. 'coins', 'wood', 'stone', 'iron', 'gold', 'axe', 'pickaxe'
  input_quantity numeric(18, 4) not null,
  input_type text not null                         -- 'coin' | 'resource' | 'tool' | 'crop' | 'animal_product'
);

create index if not exists idx_production_recipe_inputs_recipe on public.production_recipe_inputs(recipe_id);

-- 6C. Farm Skill Modifiers Table (Stores verified Bumpkin skill discounts & yield bonuses from API)
create table if not exists public.farm_skill_modifiers (
  id uuid primary key default gen_random_uuid(),
  farm_id text not null,
  skill_name text not null,
  target_recipe_id text,
  target_item_id text,
  modifier_type text not null,                     -- 'coin_discount' | 'yield_bonus' | 'duration_reduction' | 'xp_bonus'
  modifier_value numeric(18, 4) not null,
  is_verified_from_api boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists idx_farm_skill_modifiers_farm on public.farm_skill_modifiers(farm_id);

alter table public.production_recipes enable row level security;
alter table public.production_recipe_inputs enable row level security;
alter table public.farm_skill_modifiers enable row level security;

create policy "Allow public read of production_recipes" on public.production_recipes
  for select using (true);
create policy "Allow public write of production_recipes" on public.production_recipes
  for all using (true) with check (true);

create policy "Allow public read of production_recipe_inputs" on public.production_recipe_inputs
  for select using (true);
create policy "Allow public write of production_recipe_inputs" on public.production_recipe_inputs
  for all using (true) with check (true);

create policy "Allow public read of farm_skill_modifiers" on public.farm_skill_modifiers
  for select using (true);
create policy "Allow public write of farm_skill_modifiers" on public.farm_skill_modifiers
  for all using (true) with check (true);



