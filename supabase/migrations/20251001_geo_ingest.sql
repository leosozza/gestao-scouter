-- ============================================================================
-- Geolocation Migration: Scouter tracking and Ficha/Lead geocoding
-- ============================================================================
-- This migration creates tables, views, indices, and RPCs for geolocation
-- functionality used by the maps and heatmap features.
--
-- Features:
-- - Scouter location tracking (Grid 1351167110)
-- - Ficha/Lead geocoding support
-- - Materialized views for performance
-- - Geospatial indices for fast queries
-- - RPC functions for frontend consumption
--
-- This migration is IDEMPOTENT and can be safely re-applied.
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Tabela normalizada de Scouters (se ainda não existir)
create table if not exists public.scouters (
  id bigserial primary key,
  name text not null,
  tier text null,                 -- Bronze/Prata/Ouro...
  status text null,               -- active/inactive
  unique (name)
);

-- Tabela de localizações dos scouters (histórico completo)
create table if not exists public.scouter_locations (
  id bigserial primary key,
  scouter_id bigint not null references public.scouters(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision null,
  heading double precision null,
  speed double precision null,
  source text not null default 'sheet', -- 'sheet' | 'app' | 'api'
  at timestamptz not null default now()
);

-- Indices para performance em queries geoespaciais
create index if not exists idx_scouter_locations_scouter_at on public.scouter_locations (scouter_id, at desc);
create index if not exists idx_scouter_locations_at on public.scouter_locations (at desc);
create index if not exists idx_scouter_locations_coords on public.scouter_locations (lat, lng);

-- Geocache para endereços de fichas/leads (evitar re-geocode)
create table if not exists public.geocache (
  query text primary key,
  lat double precision not null,
  lng double precision not null,
  resolved_at timestamptz not null default now()
);

-- ============================================================================
-- GARANTIR COLUNAS DE GEOLOCALIZAÇÃO
-- ============================================================================

-- Garantir colunas de geo em fichas (tabela legada)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='fichas') then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='fichas' and column_name='lat') then
      alter table public.fichas add column lat double precision null;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='fichas' and column_name='lng') then
      alter table public.fichas add column lng double precision null;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='fichas' and column_name='localizacao') then
      alter table public.fichas add column localizacao text null;
    end if;
  end if;
end $$;

-- Garantir colunas de geo em leads (tabela atual)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='leads') then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='latitude') then
      alter table public.leads add column latitude double precision null;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='longitude') then
      alter table public.leads add column longitude double precision null;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='localizacao') then
      alter table public.leads add column localizacao text null;
    end if;
  end if;
end $$;

-- Indices geoespaciais
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='fichas') then
    create index if not exists idx_fichas_latlng on public.fichas (lat, lng) where lat is not null and lng is not null;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='leads') then
    create index if not exists idx_leads_latlng on public.leads (latitude, longitude) where latitude is not null and longitude is not null;
  end if;
end $$;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: última posição por scouter (singular - para queries internas)
create or replace view public.scouter_last_location as
select distinct on (sl.scouter_id)
  sl.scouter_id, 
  s.name as scouter, 
  s.tier, 
  s.status,
  sl.lat, 
  sl.lng, 
  sl.accuracy, 
  sl.heading, 
  sl.speed, 
  sl.source, 
  sl.at
from public.scouter_locations sl
join public.scouters s on s.id = sl.scouter_id
order by sl.scouter_id, sl.at desc;

-- View: últimas localizações (plural - para frontend/hooks)
-- Alias para compatibilidade com hooks existentes
create or replace view public.scouters_last_locations as
select * from public.scouter_last_location;

-- Materialized view: fichas com geolocalização (para performance em heatmaps)
-- Atualizar periodicamente via REFRESH MATERIALIZED VIEW
-- Só cria se a tabela fichas existir
do $$ 
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='fichas') then
    -- Dropar se já existe para recriar
    drop materialized view if exists public.fichas_geo;
    
    -- Criar materialized view
    create materialized view public.fichas_geo as
      select 
        f.id,
        coalesce(f.lat, 0.0) as latitude,
        coalesce(f.lng, 0.0) as longitude,
        f.projeto,
        f.scouter,
        coalesce(f.created_at, f.criado::timestamptz) as criado,
        f.localizacao
      from public.fichas f
      where (f.lat is not null and f.lng is not null)
        and (f.deleted is null or f.deleted = false);
    
    -- Criar índices na materialized view
    create unique index if not exists idx_fichas_geo_id on public.fichas_geo (id);
    create index if not exists idx_fichas_geo_coords on public.fichas_geo (latitude, longitude);
    create index if not exists idx_fichas_geo_criado on public.fichas_geo (criado);
  end if;
end $$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- RLS mínima (ajuste conforme necessidade de tenant/autenticação)
alter table public.scouters enable row level security;
alter table public.scouter_locations enable row level security;
alter table public.geocache enable row level security;

-- Políticas idempotentes
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='scouters' and polname='scouters_read') then
    create policy scouters_read on public.scouters for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='scouter_locations' and polname='scouter_locations_read') then
    create policy scouter_locations_read on public.scouter_locations for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='scouter_locations' and polname='scouter_locations_insert') then
    create policy scouter_locations_insert on public.scouter_locations for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='geocache' and polname='geocache_read') then
    create policy geocache_read on public.geocache for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='geocache' and polname='geocache_write') then
    create policy geocache_write on public.geocache for insert to authenticated with check (true);
  end if;
end $$;

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================
-- 1) Últimas localizações dos scouters (para o mapa de clustering)
-- Retorna a última posição conhecida de cada scouter
create or replace function public.get_scouters_last_locations()
returns table(
  scouter text, 
  tier text, 
  lat double precision, 
  lng double precision, 
  at timestamptz,
  status text
)
language sql security definer set search_path=public 
stable
as $$
  select 
    l.scouter, 
    l.tier, 
    l.lat,
    l.lng,
    l.at,
    coalesce(l.status, 'active') as status
  from public.scouter_last_location l
  order by l.scouter asc;
$$;

-- Comentário para documentação
comment on function public.get_scouters_last_locations() is 
  'Retorna a última localização conhecida de cada scouter para exibição no mapa de clustering. Inclui tier, status e timestamp da última atualização.';

-- 2) Geo de fichas para heatmap
-- Suporta tanto a tabela 'fichas' quanto 'leads' com fallback automático
create or replace function public.get_fichas_geo(
  p_start date,
  p_end date,
  p_project text default null,
  p_scouter text default null
) 
returns table(
  id bigint, 
  lat double precision, 
  lng double precision, 
  created_at timestamptz, 
  projeto text, 
  scouter text
)
language plpgsql security definer set search_path=public
stable
as $$
begin
  -- Tenta buscar da tabela leads primeiro (tabela atual)
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='leads') then
    return query
    select 
      l.id,
      l.latitude as lat,
      l.longitude as lng,
      coalesce(l.criado, l.created_at) as created_at,
      coalesce(l.projeto, l.commercial_project_id) as projeto,
      l.scouter
    from public.leads l
    where 
      coalesce(l.criado::date, l.created_at::date) between p_start and p_end
      and l.latitude is not null 
      and l.longitude is not null
      and (l.deleted is null or l.deleted = false)
      and (p_project is null or coalesce(l.projeto, l.commercial_project_id) = p_project)
      and (p_scouter is null or l.scouter = p_scouter);
    return;
  end if;

  -- Fallback para tabela fichas (legada)
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='fichas') then
    return query
    select 
      case 
        when f.id ~ '^\d+$' then f.id::bigint  -- se é numérico, converte
        else abs(hashtext(f.id))  -- senão, gera hash numérico
      end as id,
      f.lat,
      f.lng,
      coalesce(f.created_at, f.criado::timestamptz) as created_at,
      f.projeto,
      f.scouter
    from public.fichas f
    where 
      coalesce(f.created_at::date, f.criado) between p_start and p_end
      and f.lat is not null 
      and f.lng is not null
      and (f.deleted is null or f.deleted = false)
      and (p_project is null or f.projeto = p_project)
      and (p_scouter is null or f.scouter = p_scouter);
    return;
  end if;

  -- Se nenhuma tabela existe, retorna vazio
  return;
end;
$$;

-- Comentário para documentação
comment on function public.get_fichas_geo(date, date, text, text) is 
  'Retorna fichas/leads com geolocalização válida para geração de heatmap. Filtra por período, projeto e scouter. Suporta ambas as tabelas fichas (legada) e leads (atual) com fallback automático.';

-- ============================================================================
-- COMENTÁRIOS E METADATA
-- ============================================================================

-- Comentários nas tabelas
comment on table public.scouters is 'Tabela normalizada de scouters com tier e status';
comment on table public.scouter_locations is 'Histórico completo de localizações dos scouters';
comment on table public.geocache is 'Cache de geocodificação para evitar chamadas repetidas a APIs externas';

-- Comentários nas views
comment on view public.scouter_last_location is 'View com a última localização de cada scouter';
comment on view public.scouters_last_locations is 'Alias plural da view scouter_last_location para compatibilidade';
comment on materialized view public.fichas_geo is 'Materialized view de fichas com geolocalização válida. Requer refresh periódico para atualização.';

-- ============================================================================
-- INSTRUÇÕES DE MANUTENÇÃO
-- ============================================================================

-- Para atualizar a materialized view (executar periodicamente):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.fichas_geo;
--
-- Para recriar índices se necessário:
-- REINDEX TABLE public.scouter_locations;
-- REINDEX INDEX idx_fichas_latlng;
-- REINDEX INDEX idx_leads_latlng;
