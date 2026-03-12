-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'tech'
);

-- Condos table
CREATE TABLE condos (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL
);

-- Equipment types table
CREATE TABLE equipment_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- Condo equipment association
CREATE TABLE condo_equipment (
  id SERIAL PRIMARY KEY,
  condo_id INTEGER NOT NULL REFERENCES condos(id) ON DELETE CASCADE,
  equipment_type_id INTEGER NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE
);

-- Tech condos association
CREATE TABLE tech_condos (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condo_id INTEGER NOT NULL REFERENCES condos(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, condo_id)
);

-- Maintenance logs table
CREATE TABLE maintenance_logs (
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
CREATE TABLE log_details (
  id SERIAL PRIMARY KEY,
  log_id INTEGER NOT NULL REFERENCES maintenance_logs(id) ON DELETE CASCADE,
  equipment_type_id INTEGER NOT NULL REFERENCES equipment_types(id),
  status TEXT NOT NULL,
  observations TEXT
);

-- Insert default admin (password: PV-Admin-2026!)
-- Note: You should use a hashed password in production. 
-- This is just a placeholder. The server will handle seeding if needed.
