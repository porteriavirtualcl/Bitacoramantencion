-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'tech',
  must_change_password BOOLEAN DEFAULT TRUE
);

-- Condos table
CREATE TABLE IF NOT EXISTS condos (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL
);

-- Equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- Condo equipment association
CREATE TABLE IF NOT EXISTS condo_equipment (
  id SERIAL PRIMARY KEY,
  condo_id INTEGER NOT NULL REFERENCES condos(id) ON DELETE CASCADE,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE
);

-- Tech condos association
CREATE TABLE IF NOT EXISTS tech_condos (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condo_id INTEGER NOT NULL REFERENCES condos(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, condo_id)
);

-- Maintenance logs table
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id SERIAL PRIMARY KEY,
  condo_id INTEGER NOT NULL REFERENCES condos(id),
  tech_id INTEGER NOT NULL REFERENCES users(id),
  log_type TEXT NOT NULL DEFAULT 'mantenimiento',
  start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'in_progress',
  problem_description TEXT,
  actions_taken TEXT
);

-- Log details table
CREATE TABLE IF NOT EXISTS log_details (
  id SERIAL PRIMARY KEY,
  log_id INTEGER NOT NULL REFERENCES maintenance_logs(id) ON DELETE CASCADE,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  status TEXT NOT NULL,
  observations TEXT
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  condo_id INTEGER NOT NULL REFERENCES condos(id),
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  operator_id INTEGER NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Media',
  status TEXT DEFAULT 'in_process',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by INTEGER REFERENCES users(id)
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin (password: PV-Admin-2026!)
-- Note: You should use a hashed password in production. 
-- This is just a placeholder. The server will handle seeding if needed.
