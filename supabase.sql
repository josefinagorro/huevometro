-- 🥚 Huevómetro — estructura de la base
-- Pegá todo esto en Supabase → SQL Editor → New query → Run

create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  cantidad integer not null check (cantidad > 0 and cantidad < 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.consumos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  cantidad integer not null check (cantidad > 0 and cantidad <= 50),
  quien text not null check (char_length(quien) between 1 and 30),
  created_at timestamptz not null default now()
);

-- Auditorías: cuántos huevos había DE VERDAD en la heladera
create table if not exists public.conteos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  cantidad integer not null check (cantidad >= 0 and cantidad < 1000),
  created_at timestamptz not null default now()
);

-- Seguridad: activamos RLS y dejamos que la web (rol anon) lea, cargue y borre.
-- Ojo: cualquiera que tenga el link de la web puede cargar datos. Para una app familiar alcanza.
alter table public.compras  enable row level security;
alter table public.consumos enable row level security;
alter table public.conteos  enable row level security;

create policy "familia lee compras"    on public.compras  for select to anon using (true);
create policy "familia carga compras"  on public.compras  for insert to anon with check (true);
create policy "familia borra compras"  on public.compras  for delete to anon using (true);

create policy "familia lee consumos"   on public.consumos for select to anon using (true);
create policy "familia carga consumos" on public.consumos for insert to anon with check (true);
create policy "familia borra consumos" on public.consumos for delete to anon using (true);

create policy "familia lee conteos"    on public.conteos  for select to anon using (true);
create policy "familia carga conteos"  on public.conteos  for insert to anon with check (true);
create policy "familia borra conteos"  on public.conteos  for delete to anon using (true);
