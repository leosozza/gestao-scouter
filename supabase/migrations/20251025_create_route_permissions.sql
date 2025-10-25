-- ============================================
-- ROUTE PERMISSIONS SYSTEM
-- Tables for managing permissions per route
-- ============================================

-- 1. CREATE app_routes TABLE
-- Stores all application routes grouped by module
CREATE TABLE IF NOT EXISTS public.app_routes (
  id SERIAL PRIMARY KEY,
  module TEXT NOT NULL, -- e.g., 'dashboard', 'leads', 'fichas', 'pagamentos', 'configuracoes'
  route_path TEXT NOT NULL UNIQUE, -- e.g., '/dashboard', '/leads', '/fichas'
  route_name TEXT NOT NULL, -- Human-readable name
  description TEXT, -- Optional description
  is_active BOOLEAN DEFAULT TRUE, -- Can disable routes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_app_routes_module ON app_routes(module);
CREATE INDEX IF NOT EXISTS idx_app_routes_active ON app_routes(is_active);

-- 2. CREATE route_permissions TABLE
-- Stores permissions for each route by department/role
CREATE TABLE IF NOT EXISTS public.route_permissions (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES app_routes(id) ON DELETE CASCADE NOT NULL,
  department TEXT, -- e.g., 'scouter', 'telemarketing', 'admin' (null = global)
  role TEXT, -- e.g., 'Agent', 'Supervisor', 'Manager', 'Admin' (null = all roles)
  allowed BOOLEAN DEFAULT FALSE, -- Permission granted or denied
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (route_id, department, role) -- Prevent duplicate permissions
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_route_permissions_route ON route_permissions(route_id);
CREATE INDEX IF NOT EXISTS idx_route_permissions_dept ON route_permissions(department);
CREATE INDEX IF NOT EXISTS idx_route_permissions_role ON route_permissions(role);

-- 3. ENABLE RLS ON TABLES
ALTER TABLE public.app_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_permissions ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
-- Only admins can manage routes
DROP POLICY IF EXISTS "Admins can view routes" ON public.app_routes;
CREATE POLICY "Admins can view routes" ON public.app_routes
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage routes" ON public.app_routes;
CREATE POLICY "Admins can manage routes" ON public.app_routes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can manage route permissions
DROP POLICY IF EXISTS "Admins can view route permissions" ON public.route_permissions;
CREATE POLICY "Admins can view route permissions" ON public.route_permissions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage route permissions" ON public.route_permissions;
CREATE POLICY "Admins can manage route permissions" ON public.route_permissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. CREATE TRIGGER FOR updated_at
DROP TRIGGER IF EXISTS app_routes_updated_at ON public.app_routes;
CREATE TRIGGER app_routes_updated_at
  BEFORE UPDATE ON public.app_routes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS route_permissions_updated_at ON public.route_permissions;
CREATE TRIGGER route_permissions_updated_at
  BEFORE UPDATE ON public.route_permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. CREATE RPC FUNCTION FOR BATCH UPDATES
-- This function allows updating multiple route permissions in a single transaction
CREATE OR REPLACE FUNCTION public.set_route_permissions_batch(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_route_id INTEGER;
  v_department TEXT;
  v_role TEXT;
  v_allowed BOOLEAN;
  v_count INTEGER := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can update route permissions';
  END IF;

  -- Process each item in the batch
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      -- Extract values from item
      v_route_id := (v_item->>'route_id')::INTEGER;
      v_department := v_item->>'department';
      v_role := v_item->>'role';
      v_allowed := (v_item->>'allowed')::BOOLEAN;

      -- Upsert permission
      INSERT INTO public.route_permissions (route_id, department, role, allowed)
      VALUES (v_route_id, v_department, v_role, v_allowed)
      ON CONFLICT (route_id, department, role)
      DO UPDATE SET 
        allowed = EXCLUDED.allowed,
        updated_at = NOW();

      v_count := v_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue processing
        v_errors := v_errors || jsonb_build_object(
          'item', v_item,
          'error', SQLERRM
        );
    END;
  END LOOP;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_count,
    'errors', v_errors
  );
END;
$$;

-- 7. SEED INITIAL ROUTES
-- Insert common application routes
INSERT INTO public.app_routes (module, route_path, route_name, description) VALUES
  ('dashboard', '/', 'Dashboard Principal', 'Página inicial com visão geral'),
  ('dashboard', '/dashboard', 'Dashboard', 'Dashboard de métricas e KPIs'),
  ('leads', '/leads', 'Leads', 'Gestão de leads e fichas'),
  ('fichas', '/area-de-abordagem', 'Área de Abordagem', 'Área de cadastro de fichas'),
  ('scouters', '/scouters', 'Scouters', 'Gestão de scouters'),
  ('pagamentos', '/pagamentos', 'Pagamentos', 'Gestão de pagamentos'),
  ('projecao', '/projecao', 'Projeção', 'Projeção financeira'),
  ('configuracoes', '/configuracoes', 'Configurações', 'Configurações do sistema'),
  ('sync', '/sync-monitor', 'Monitor de Sincronização', 'Monitoramento de sincronização')
ON CONFLICT (route_path) DO NOTHING;

-- 8. SEED DEFAULT PERMISSIONS
-- Set default permissions for common roles
-- Admin has access to everything (already handled by RLS)
-- These are examples; actual permissions should be configured via UI
INSERT INTO public.route_permissions (route_id, department, role, allowed)
SELECT 
  r.id,
  'scouter',
  'Agent',
  true
FROM public.app_routes r
WHERE r.route_path IN ('/', '/dashboard', '/area-de-abordagem', '/leads')
ON CONFLICT DO NOTHING;

INSERT INTO public.route_permissions (route_id, department, role, allowed)
SELECT 
  r.id,
  'scouter',
  'Supervisor',
  true
FROM public.app_routes r
WHERE r.route_path IN ('/', '/dashboard', '/leads', '/scouters', '/pagamentos')
ON CONFLICT DO NOTHING;

-- 9. CREATE HELPER FUNCTION TO CHECK ROUTE PERMISSION
CREATE OR REPLACE FUNCTION public.user_has_route_permission(
  _user_id UUID,
  _route_path TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_route_id INTEGER;
BEGIN
  -- Admins always have access
  IF public.has_role(_user_id, 'admin') THEN
    RETURN TRUE;
  END IF;

  -- Get route ID
  SELECT id INTO v_route_id
  FROM public.app_routes
  WHERE route_path = _route_path AND is_active = true;

  -- Route doesn't exist or is disabled
  IF v_route_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has permission
  -- This is a simplified version; you may need to enhance based on your user role structure
  SELECT COALESCE(MAX(allowed), false) INTO v_has_permission
  FROM public.route_permissions
  WHERE route_id = v_route_id;

  RETURN v_has_permission;
END;
$$;
