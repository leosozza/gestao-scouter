-- ============================================================================
-- Migration: App Routes and Route Permissions System
-- ============================================================================
-- Date: 2025-10-25
-- Description: Creates tables and functions for application route access control
-- 
-- Tables:
-- - app_routes: Available application routes with metadata
-- - route_permissions: Role and department-based route access rules
-- - route_access_logs: Audit trail for route access attempts
--
-- Functions:
-- - can_access_route: Check if user can access a specific route
--
-- RLS Policies:
-- - SELECT for authenticated users on active routes
-- - Full CRUD for admins on all route tables
-- ============================================================================

-- ============================================================================
-- 1. Create app_routes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments for app_routes
COMMENT ON TABLE public.app_routes IS 'Application routes available in the system';
COMMENT ON COLUMN public.app_routes.path IS 'Route path (e.g., /dashboard, /leads)';
COMMENT ON COLUMN public.app_routes.name IS 'Human-readable route name';
COMMENT ON COLUMN public.app_routes.description IS 'Description of route functionality';
COMMENT ON COLUMN public.app_routes.module IS 'Module or section this route belongs to';
COMMENT ON COLUMN public.app_routes.active IS 'Whether the route is currently active';

-- Indexes for app_routes
CREATE INDEX IF NOT EXISTS idx_app_routes_path ON public.app_routes(path);
CREATE INDEX IF NOT EXISTS idx_app_routes_active ON public.app_routes(active);
CREATE INDEX IF NOT EXISTS idx_app_routes_module ON public.app_routes(module);

-- ============================================================================
-- 2. Create route_permissions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.route_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.app_routes(id) ON DELETE CASCADE,
  role app_role,
  department TEXT,
  allowed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, role, department)
);

-- Comments for route_permissions
COMMENT ON TABLE public.route_permissions IS 'Access permissions for routes based on role and department';
COMMENT ON COLUMN public.route_permissions.route_id IS 'Reference to the route in app_routes';
COMMENT ON COLUMN public.route_permissions.role IS 'User role that has access (from app_role enum)';
COMMENT ON COLUMN public.route_permissions.department IS 'User department that has access (optional)';
COMMENT ON COLUMN public.route_permissions.allowed IS 'Whether access is allowed for this role/department combination';

-- Indexes for route_permissions
CREATE INDEX IF NOT EXISTS idx_route_permissions_route_id ON public.route_permissions(route_id);
CREATE INDEX IF NOT EXISTS idx_route_permissions_role ON public.route_permissions(role);
CREATE INDEX IF NOT EXISTS idx_route_permissions_department ON public.route_permissions(department);
CREATE INDEX IF NOT EXISTS idx_route_permissions_allowed ON public.route_permissions(allowed);

-- ============================================================================
-- 3. Create route_access_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.route_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  route_path TEXT NOT NULL,
  access_granted BOOLEAN NOT NULL,
  user_role app_role,
  user_department TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Comments for route_access_logs
COMMENT ON TABLE public.route_access_logs IS 'Audit trail for route access attempts';
COMMENT ON COLUMN public.route_access_logs.user_id IS 'User who attempted to access the route';
COMMENT ON COLUMN public.route_access_logs.route_path IS 'Path of the route accessed';
COMMENT ON COLUMN public.route_access_logs.access_granted IS 'Whether access was granted';
COMMENT ON COLUMN public.route_access_logs.user_role IS 'Role of the user at time of access';
COMMENT ON COLUMN public.route_access_logs.user_department IS 'Department of the user at time of access';
COMMENT ON COLUMN public.route_access_logs.metadata IS 'Additional metadata (IP, browser, etc.)';

-- Indexes for route_access_logs
CREATE INDEX IF NOT EXISTS idx_route_access_logs_user_id ON public.route_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_route_access_logs_route_path ON public.route_access_logs(route_path);
CREATE INDEX IF NOT EXISTS idx_route_access_logs_accessed_at ON public.route_access_logs(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_access_logs_access_granted ON public.route_access_logs(access_granted);

-- ============================================================================
-- 4. Add update_updated_at triggers
-- ============================================================================

-- Trigger for app_routes
DROP TRIGGER IF EXISTS set_updated_at_app_routes ON public.app_routes;
CREATE TRIGGER set_updated_at_app_routes
  BEFORE UPDATE ON public.app_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TRIGGER set_updated_at_app_routes ON public.app_routes IS 'Automatically update updated_at on changes';

-- Trigger for route_permissions
DROP TRIGGER IF EXISTS set_updated_at_route_permissions ON public.route_permissions;
CREATE TRIGGER set_updated_at_route_permissions
  BEFORE UPDATE ON public.route_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TRIGGER set_updated_at_route_permissions ON public.route_permissions IS 'Automatically update updated_at on changes';

-- ============================================================================
-- 5. Create can_access_route RPC function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_access_route(_user_id UUID, _route_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _route_id UUID;
  _route_active BOOLEAN;
  _user_role app_role;
  _user_department TEXT;
  _is_admin BOOLEAN;
  _has_permission BOOLEAN;
BEGIN
  -- Check if route exists and is active
  SELECT id, active INTO _route_id, _route_active
  FROM public.app_routes
  WHERE path = _route_path;
  
  -- If route doesn't exist or is not active, deny access
  IF _route_id IS NULL OR _route_active = FALSE THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's role
  SELECT role INTO _user_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
  
  -- If user has no role, deny access
  IF _user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is admin (admins always have access)
  _is_admin := public.has_role(_user_id, 'admin');
  IF _is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's department (if exists in profiles table)
  SELECT project INTO _user_department
  FROM public.profiles
  WHERE id = _user_id;
  
  -- Check route_permissions for this route
  -- A user has access if there's a permission record that matches their role or department
  SELECT EXISTS (
    SELECT 1
    FROM public.route_permissions rp
    WHERE rp.route_id = _route_id
      AND rp.allowed = TRUE
      AND (
        -- Match by role only
        (rp.role = _user_role AND rp.department IS NULL)
        OR
        -- Match by department only
        (rp.role IS NULL AND rp.department = _user_department)
        OR
        -- Match by both role and department
        (rp.role = _user_role AND rp.department = _user_department)
      )
  ) INTO _has_permission;
  
  RETURN _has_permission;
END;
$$;

COMMENT ON FUNCTION public.can_access_route(UUID, TEXT) IS 'Check if a user can access a specific route based on role and department permissions';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_access_route(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_route(UUID, TEXT) TO service_role;

-- ============================================================================
-- 6. Enable RLS on tables
-- ============================================================================

ALTER TABLE public.app_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_access_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. Create RLS Policies for app_routes
-- ============================================================================

-- Policy: Authenticated users can view active routes
CREATE POLICY "Authenticated users can view active routes"
  ON public.app_routes
  FOR SELECT
  TO authenticated
  USING (active = TRUE);

-- Policy: Admins have full access to all routes
CREATE POLICY "Admins have full access to app_routes"
  ON public.app_routes
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to app_routes"
  ON public.app_routes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 8. Create RLS Policies for route_permissions
-- ============================================================================

-- Policy: Authenticated users can view permissions
CREATE POLICY "Authenticated users can view route_permissions"
  ON public.route_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins have full access to permissions
CREATE POLICY "Admins have full access to route_permissions"
  ON public.route_permissions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to route_permissions"
  ON public.route_permissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 9. Create RLS Policies for route_access_logs
-- ============================================================================

-- Policy: Users can view their own access logs
CREATE POLICY "Users can view own access logs"
  ON public.route_access_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all access logs
CREATE POLICY "Admins can view all access logs"
  ON public.route_access_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can manage all access logs
CREATE POLICY "Admins can manage all access logs"
  ON public.route_access_logs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to route_access_logs"
  ON public.route_access_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 10. Grant permissions
-- ============================================================================

GRANT ALL ON public.app_routes TO service_role;
GRANT ALL ON public.route_permissions TO service_role;
GRANT ALL ON public.route_access_logs TO service_role;

GRANT SELECT ON public.app_routes TO authenticated;
GRANT SELECT ON public.route_permissions TO authenticated;

-- ============================================================================
-- 11. Seed initial data (common routes)
-- ============================================================================

-- Insert common application routes
INSERT INTO public.app_routes (path, name, description, module, active) VALUES
  ('/dashboard', 'Dashboard', 'Main dashboard with KPIs and analytics', 'core', TRUE),
  ('/leads', 'Leads', 'Lead management and tracking', 'leads', TRUE),
  ('/fichas', 'Fichas', 'Scout registration forms', 'fichas', TRUE),
  ('/pagamentos', 'Pagamentos', 'Payment processing and tracking', 'financial', TRUE),
  ('/configuracoes', 'Configurações', 'System settings and configuration', 'settings', TRUE),
  ('/usuarios', 'Usuários', 'User management', 'admin', TRUE),
  ('/relatorios', 'Relatórios', 'Reports and analytics', 'reports', TRUE)
ON CONFLICT (path) DO NOTHING;

-- Insert default permissions for common routes
-- Dashboard: accessible to all authenticated users
INSERT INTO public.route_permissions (route_id, role, department, allowed)
SELECT id, 'scouter'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/dashboard'
UNION ALL
SELECT id, 'supervisor'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/dashboard'
UNION ALL
SELECT id, 'telemarketing'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/dashboard'
UNION ALL
SELECT id, 'gestor_telemarketing'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/dashboard'
ON CONFLICT (route_id, role, department) DO NOTHING;

-- Leads: accessible to all roles
INSERT INTO public.route_permissions (route_id, role, department, allowed)
SELECT id, 'scouter'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/leads'
UNION ALL
SELECT id, 'supervisor'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/leads'
UNION ALL
SELECT id, 'telemarketing'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/leads'
UNION ALL
SELECT id, 'gestor_telemarketing'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/leads'
ON CONFLICT (route_id, role, department) DO NOTHING;

-- Fichas: accessible to scouters and supervisors
INSERT INTO public.route_permissions (route_id, role, department, allowed)
SELECT id, 'scouter'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/fichas'
UNION ALL
SELECT id, 'supervisor'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/fichas'
ON CONFLICT (route_id, role, department) DO NOTHING;

-- Pagamentos: accessible to supervisors and admins only (via admin check in can_access_route)
INSERT INTO public.route_permissions (route_id, role, department, allowed)
SELECT id, 'supervisor'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/pagamentos'
ON CONFLICT (route_id, role, department) DO NOTHING;

-- Configurações: admin only (no explicit permission needed as admins always have access)

-- Usuários: admin only (no explicit permission needed)

-- Relatórios: accessible to supervisors and above
INSERT INTO public.route_permissions (route_id, role, department, allowed)
SELECT id, 'supervisor'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/relatorios'
UNION ALL
SELECT id, 'gestor_telemarketing'::app_role, NULL, TRUE FROM public.app_routes WHERE path = '/relatorios'
ON CONFLICT (route_id, role, department) DO NOTHING;

-- ============================================================================
-- 12. Verification
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
  function_exists BOOLEAN;
BEGIN
  -- Verify tables were created
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('app_routes', 'route_permissions', 'route_access_logs');
  
  IF table_count < 3 THEN
    RAISE EXCEPTION 'Not all tables were created. Expected: 3, Found: %', table_count;
  END IF;
  
  -- Verify function was created
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'can_access_route'
  ) INTO function_exists;
  
  IF NOT function_exists THEN
    RAISE EXCEPTION 'Function can_access_route was not created';
  END IF;
  
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '✅ Tables created: app_routes, route_permissions, route_access_logs';
  RAISE NOTICE '✅ Function created: can_access_route';
  RAISE NOTICE '✅ RLS policies enabled and configured';
  RAISE NOTICE '✅ Initial route data seeded';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
