-- ============================================================================
-- 20251026_route_permissions_advanced.sql
-- Advanced Route Permissions: Temporal Validity and Role Hierarchy
-- ============================================================================

-- 1. CREATE route_permissions TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.route_permissions (
  id SERIAL PRIMARY KEY,
  route_path TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from TIMESTAMPTZ DEFAULT NULL,
  valid_until TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (route_path, role_id)
);

-- Add constraint to ensure valid_from <= valid_until when both are not null
ALTER TABLE public.route_permissions 
  DROP CONSTRAINT IF EXISTS check_valid_dates;

ALTER TABLE public.route_permissions 
  ADD CONSTRAINT check_valid_dates 
  CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_route_permissions_route_path ON public.route_permissions(route_path);
CREATE INDEX IF NOT EXISTS idx_route_permissions_role_id ON public.route_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_route_permissions_valid_dates ON public.route_permissions(valid_from, valid_until);

-- Enable RLS
ALTER TABLE public.route_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can read route permissions
CREATE POLICY route_permissions_read ON public.route_permissions
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- RLS Policy: Admins can manage route permissions
CREATE POLICY route_permissions_admin_all ON public.route_permissions
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.route_permissions IS 'Permissions for routes with temporal validity and role hierarchy support';
COMMENT ON COLUMN public.route_permissions.valid_from IS 'Permission is valid from this timestamp (NULL means no start restriction)';
COMMENT ON COLUMN public.route_permissions.valid_until IS 'Permission is valid until this timestamp (NULL means no end restriction)';

-- 2. ROLE HIERARCHY HELPER FUNCTION
-- ============================================================================
-- This function returns all roles that a given role inherits from (including itself)
-- Hierarchy: admin > gestor_telemarketing > supervisor > telemarketing > scouter
CREATE OR REPLACE FUNCTION public.get_inherited_roles(target_role_name TEXT)
RETURNS TABLE (role_name TEXT)
LANGUAGE SQL
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE role_hierarchy AS (
    -- Define the role hierarchy levels (lower level = higher privilege)
    SELECT 'admin'::TEXT as role, 1 as level
    UNION ALL SELECT 'gestor_telemarketing', 2
    UNION ALL SELECT 'supervisor', 3
    UNION ALL SELECT 'telemarketing', 4
    UNION ALL SELECT 'scouter', 5
  ),
  target_level AS (
    SELECT level FROM role_hierarchy WHERE role = target_role_name
  )
  -- Return all roles with level >= target level (equal or lower privilege)
  SELECT role_hierarchy.role::TEXT
  FROM role_hierarchy, target_level
  WHERE role_hierarchy.level <= target_level.level
  ORDER BY role_hierarchy.level;
$$;

COMMENT ON FUNCTION public.get_inherited_roles IS 'Returns all roles that the given role inherits from (including itself) based on hierarchy';

-- 3. CAN_ACCESS_ROUTE FUNCTION
-- ============================================================================
-- Checks if a user can access a specific route considering:
-- - Direct role permission
-- - Role hierarchy inheritance (higher roles inherit lower role permissions)
-- - Temporal validity (valid_from/valid_until)
CREATE OR REPLACE FUNCTION public.can_access_route(
  user_id UUID,
  route_path TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_name TEXT;
  has_permission BOOLEAN := FALSE;
  current_time TIMESTAMPTZ := NOW();
BEGIN
  -- Get the user's role name
  SELECT r.name INTO user_role_name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = user_id;
  
  -- If user has no role, deny access
  IF user_role_name IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has permission through direct role or inherited roles
  -- considering temporal validity
  SELECT EXISTS (
    SELECT 1
    FROM public.route_permissions rp
    JOIN public.roles r ON r.id = rp.role_id
    WHERE rp.route_path = can_access_route.route_path
      AND rp.allowed = TRUE
      -- Check if the permission role is in the user's inherited roles
      AND r.name IN (SELECT role_name FROM public.get_inherited_roles(user_role_name))
      -- Check temporal validity
      AND (rp.valid_from IS NULL OR rp.valid_from <= current_time)
      AND (rp.valid_until IS NULL OR rp.valid_until >= current_time)
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$;

COMMENT ON FUNCTION public.can_access_route IS 'Checks if a user can access a route considering role hierarchy and temporal validity';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_inherited_roles(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_route(UUID, TEXT) TO authenticated;

-- 4. HELPER FUNCTIONS FOR MANAGING ROUTE PERMISSIONS
-- ============================================================================

-- Function to set a route permission with optional temporal validity
CREATE OR REPLACE FUNCTION public.set_route_permission(
  p_route_path TEXT,
  p_role_id INTEGER,
  p_allowed BOOLEAN,
  p_valid_from TIMESTAMPTZ DEFAULT NULL,
  p_valid_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can manage route permissions
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can manage route permissions';
  END IF;
  
  -- Validate temporal dates
  IF p_valid_from IS NOT NULL AND p_valid_until IS NOT NULL AND p_valid_from > p_valid_until THEN
    RAISE EXCEPTION 'valid_from must be less than or equal to valid_until';
  END IF;
  
  -- Insert or update route permission
  INSERT INTO public.route_permissions (route_path, role_id, allowed, valid_from, valid_until, updated_at)
  VALUES (p_route_path, p_role_id, p_allowed, p_valid_from, p_valid_until, NOW())
  ON CONFLICT (route_path, role_id) 
  DO UPDATE SET 
    allowed = EXCLUDED.allowed,
    valid_from = EXCLUDED.valid_from,
    valid_until = EXCLUDED.valid_until,
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.set_route_permission IS 'Sets or updates a route permission with optional temporal validity. Admin only.';

-- Function to list all route permissions
CREATE OR REPLACE FUNCTION public.list_route_permissions()
RETURNS TABLE (
  id INTEGER,
  route_path TEXT,
  role_id INTEGER,
  role_name TEXT,
  allowed BOOLEAN,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_currently_valid BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rp.id,
    rp.route_path,
    rp.role_id,
    r.name AS role_name,
    rp.allowed,
    rp.valid_from,
    rp.valid_until,
    -- Check if permission is currently valid
    (
      rp.allowed = TRUE
      AND (rp.valid_from IS NULL OR rp.valid_from <= NOW())
      AND (rp.valid_until IS NULL OR rp.valid_until >= NOW())
    ) AS is_currently_valid,
    rp.created_at
  FROM public.route_permissions rp
  JOIN public.roles r ON r.id = rp.role_id
  WHERE auth.uid() IS NOT NULL
  ORDER BY rp.route_path, r.name;
$$;

COMMENT ON FUNCTION public.list_route_permissions IS 'Lists all route permissions with temporal validity status';

GRANT EXECUTE ON FUNCTION public.set_route_permission(TEXT, INTEGER, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_route_permissions() TO authenticated;

-- 5. SEED DATA - Example route permissions
-- ============================================================================

-- Insert some example route permissions for testing
-- Admin has access to all routes (no temporal restriction)
INSERT INTO public.route_permissions (route_path, role_id, allowed)
SELECT '/dashboard', r.id, TRUE
FROM public.roles r
WHERE r.name = 'admin'
ON CONFLICT (route_path, role_id) DO NOTHING;

INSERT INTO public.route_permissions (route_path, role_id, allowed)
SELECT '/configuracoes', r.id, TRUE
FROM public.roles r
WHERE r.name = 'admin'
ON CONFLICT (route_path, role_id) DO NOTHING;

-- Supervisor has access to dashboard and leads (no temporal restriction)
INSERT INTO public.route_permissions (route_path, role_id, allowed)
SELECT '/dashboard', r.id, TRUE
FROM public.roles r
WHERE r.name = 'supervisor'
ON CONFLICT (route_path, role_id) DO NOTHING;

INSERT INTO public.route_permissions (route_path, role_id, allowed)
SELECT '/leads', r.id, TRUE
FROM public.roles r
WHERE r.name = 'supervisor'
ON CONFLICT (route_path, role_id) DO NOTHING;

-- Scouter has access to limited routes
INSERT INTO public.route_permissions (route_path, role_id, allowed)
SELECT '/dashboard', r.id, TRUE
FROM public.roles r
WHERE r.name = 'scouter'
ON CONFLICT (route_path, role_id) DO NOTHING;
