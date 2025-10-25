-- ============================================
-- ROUTE PERMISSIONS SYSTEM
-- Implements fine-grained route access control
-- ============================================

-- 1. Create route_permissions table
CREATE TABLE IF NOT EXISTS public.route_permissions (
  id SERIAL PRIMARY KEY,
  route_path TEXT NOT NULL UNIQUE,
  required_roles TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  allow_by_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on route_permissions
ALTER TABLE public.route_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read route permissions
DROP POLICY IF EXISTS "Authenticated users can view route permissions" ON public.route_permissions;
CREATE POLICY "Authenticated users can view route permissions" ON public.route_permissions
  FOR SELECT TO authenticated USING (true);

-- Policy: Only admins can manage route permissions
DROP POLICY IF EXISTS "Admins can manage route permissions" ON public.route_permissions;
CREATE POLICY "Admins can manage route permissions" ON public.route_permissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create can_access_route RPC function
CREATE OR REPLACE FUNCTION public.can_access_route(route_path TEXT)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  route_config RECORD;
  allow_default BOOLEAN;
BEGIN
  -- Get the user's role from user_roles table
  SELECT ur.role::TEXT INTO user_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
  
  -- If no role found, deny access
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admin always has access
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if route is registered in route_permissions
  SELECT * INTO route_config
  FROM public.route_permissions
  WHERE route_permissions.route_path = can_access_route.route_path;
  
  -- If route not found in table
  IF NOT FOUND THEN
    -- Check for wildcard patterns (e.g., /scouter/*)
    SELECT * INTO route_config
    FROM public.route_permissions
    WHERE can_access_route.route_path LIKE REPLACE(route_permissions.route_path, '*', '%')
    ORDER BY LENGTH(route_permissions.route_path) DESC
    LIMIT 1;
    
    -- If still not found, check global default
    IF NOT FOUND THEN
      SELECT allow_by_default INTO allow_default
      FROM public.route_permissions
      WHERE route_path = '__default__';
      
      -- If no default config, deny access by default
      RETURN COALESCE(allow_default, FALSE);
    END IF;
  END IF;
  
  -- Check if user's role is in the required_roles array
  RETURN user_role = ANY(route_config.required_roles);
END;
$$;

COMMENT ON FUNCTION public.can_access_route IS 'Verifica se o usuário autenticado tem permissão para acessar uma rota específica baseado em seu role';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.can_access_route(TEXT) TO authenticated;

-- 3. Seed initial route permissions
INSERT INTO public.route_permissions (route_path, required_roles, description, allow_by_default) VALUES
  -- Default fallback - deny by default for unregistered routes
  ('__default__', '{}', 'Fallback for routes not explicitly defined', FALSE),
  
  -- Admin routes - only admin can access
  ('/admin/*', ARRAY['admin'], 'Admin panel and all admin routes', FALSE),
  
  -- Dashboard routes - different access levels
  ('/dashboard', ARRAY['admin', 'supervisor', 'scouter', 'gestor_telemarketing'], 'Main dashboard', FALSE),
  ('/dashboard-manager', ARRAY['admin', 'supervisor', 'gestor_telemarketing'], 'Manager dashboard', FALSE),
  
  -- Lead/Fichas routes - most roles can access
  ('/leads', ARRAY['admin', 'supervisor', 'scouter', 'telemarketing', 'gestor_telemarketing'], 'Leads management', FALSE),
  ('/lead', ARRAY['admin', 'supervisor', 'scouter', 'telemarketing', 'gestor_telemarketing'], 'Individual lead page', FALSE),
  
  -- Scouter specific routes
  ('/scouter/*', ARRAY['admin', 'supervisor', 'scouter'], 'Scouter specific routes', FALSE),
  ('/scouter/area', ARRAY['admin', 'supervisor', 'scouter'], 'Area de Abordagem', FALSE),
  ('/scouter/analise', ARRAY['admin', 'supervisor', 'scouter'], 'Análise de Performance', FALSE),
  ('/area-de-abordagem', ARRAY['admin', 'supervisor', 'scouter'], 'Area de Abordagem (alternative)', FALSE),
  
  -- Scouters management - only supervisors and admins
  ('/scouters', ARRAY['admin', 'supervisor'], 'View and manage scouters', FALSE),
  
  -- Payments - admin and supervisors
  ('/pagamentos', ARRAY['admin', 'supervisor'], 'Payment management', FALSE),
  
  -- Projection - admin and supervisors
  ('/projecao', ARRAY['admin', 'supervisor', 'gestor_telemarketing'], 'Business projections', FALSE),
  
  -- Settings - all authenticated users (but settings page should have internal checks)
  ('/configuracoes', ARRAY['admin', 'supervisor', 'scouter', 'telemarketing', 'gestor_telemarketing'], 'User settings', FALSE),
  
  -- Sync monitor - admin only
  ('/sync-monitor', ARRAY['admin'], 'Sync monitoring dashboard', FALSE),
  
  -- Bitrix callback - all authenticated (technical endpoint)
  ('/bitrix-callback', ARRAY['admin', 'supervisor', 'scouter', 'telemarketing', 'gestor_telemarketing'], 'Bitrix integration callback', FALSE)
ON CONFLICT (route_path) DO UPDATE SET
  required_roles = EXCLUDED.required_roles,
  description = EXCLUDED.description,
  allow_by_default = EXCLUDED.allow_by_default,
  updated_at = NOW();

-- 4. Create trigger for updated_at
DROP TRIGGER IF EXISTS route_permissions_updated_at ON public.route_permissions;
CREATE TRIGGER route_permissions_updated_at
  BEFORE UPDATE ON public.route_permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_route_permissions_path ON public.route_permissions(route_path);

-- 6. Grant necessary permissions
GRANT SELECT ON public.route_permissions TO authenticated;
