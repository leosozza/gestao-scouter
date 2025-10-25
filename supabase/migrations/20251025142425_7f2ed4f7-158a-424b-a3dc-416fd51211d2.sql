-- Create routes table to store route definitions and permissions
CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  path VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  requires_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create route_permissions table to map roles to routes
CREATE TABLE IF NOT EXISTS route_permissions (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  allowed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(route_id, role_id)
);

-- Create RPC function to check if user can access a route
CREATE OR REPLACE FUNCTION can_access_route(
  _user_id UUID,
  _route_path VARCHAR
)
RETURNS TABLE (
  can_access BOOLEAN,
  route_name VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_id INTEGER;
  v_role_name VARCHAR;
  v_route_id INTEGER;
  v_route_name VARCHAR;
  v_requires_admin BOOLEAN;
  v_has_permission BOOLEAN;
BEGIN
  -- Get user's role
  SELECT u.role_id, r.name INTO v_role_id, v_role_name
  FROM users u
  JOIN roles r ON u.role_id = r.role_id
  WHERE u.id = _user_id;

  -- If user not found, deny access
  IF v_role_id IS NULL THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::VARCHAR;
    RETURN;
  END IF;

  -- Admin has access to everything
  IF v_role_name = 'admin' THEN
    -- Try to get route name if it exists
    SELECT id, name, requires_admin INTO v_route_id, v_route_name, v_requires_admin
    FROM routes
    WHERE path = _route_path;
    
    RETURN QUERY SELECT TRUE::BOOLEAN, COALESCE(v_route_name, _route_path)::VARCHAR;
    RETURN;
  END IF;

  -- Check if route exists in routes table
  SELECT id, name, requires_admin INTO v_route_id, v_route_name, v_requires_admin
  FROM routes
  WHERE path = _route_path;

  -- If route doesn't exist in table, allow access (permissive default)
  IF v_route_id IS NULL THEN
    RETURN QUERY SELECT TRUE::BOOLEAN, _route_path::VARCHAR;
    RETURN;
  END IF;

  -- If route requires admin and user is not admin, deny
  IF v_requires_admin = TRUE THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, v_route_name::VARCHAR;
    RETURN;
  END IF;

  -- Check specific route permissions
  SELECT allowed INTO v_has_permission
  FROM route_permissions
  WHERE route_id = v_route_id AND role_id = v_role_id;

  -- If no specific permission found, allow by default
  IF v_has_permission IS NULL THEN
    v_has_permission := TRUE;
  END IF;

  RETURN QUERY SELECT v_has_permission::BOOLEAN, v_route_name::VARCHAR;
END;
$$;

-- Insert some common routes (examples)
INSERT INTO routes (path, name, description, requires_admin) VALUES
  ('/dashboard', 'Dashboard', 'Main dashboard view', FALSE),
  ('/configuracoes', 'Configurações', 'System settings', TRUE),
  ('/usuarios', 'Usuários', 'User management', TRUE),
  ('/leads', 'Leads', 'Lead management', FALSE),
  ('/scouters', 'Scouters', 'Scouter management', FALSE)
ON CONFLICT (path) DO NOTHING;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION can_access_route(UUID, VARCHAR) TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_routes_path ON routes(path);
CREATE INDEX IF NOT EXISTS idx_route_permissions_route_role ON route_permissions(route_id, role_id);

COMMENT ON FUNCTION can_access_route IS 'Check if a user can access a specific route based on their role and permissions';
COMMENT ON TABLE routes IS 'Stores route definitions and access requirements';
COMMENT ON TABLE route_permissions IS 'Maps roles to routes with specific permissions';
