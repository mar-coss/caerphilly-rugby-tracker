-- =============================================================================
-- Caerphilly Rugby Tracker — Development Seed Data
-- =============================================================================
-- Run this AFTER schema.sql to populate the database with sample data for
-- local development and testing.
-- WARNING: Do not run in production.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Coaches
-- ---------------------------------------------------------------------------

INSERT INTO coaches (first_name, last_name, email, phone, role) VALUES
  ('Gareth', 'Williams', 'gareth.w@caerphillyrfc.co.uk', '07700 900001', 'Head Coach'),
  ('Rhys', 'Morgan',    'rhys.m@caerphillyrfc.co.uk',   '07700 900002', 'Forwards Coach'),
  ('Dylan', 'Jones',   'dylan.j@caerphillyrfc.co.uk',   '07700 900003', 'Backs Coach')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------------

INSERT INTO players (first_name, last_name, position, squad_number, status) VALUES
  ('Ieuan',   'Thomas',   'Loosehead Prop',   1,  'active'),
  ('Cai',     'Davies',   'Hooker',           2,  'active'),
  ('Sion',    'Evans',    'Tighthead Prop',   3,  'active'),
  ('Rhys',    'Jenkins',  'Lock',             4,  'active'),
  ('Owen',    'Harris',   'Lock',             5,  'active'),
  ('Liam',    'Williams', 'Blindside Flanker',6,  'active'),
  ('Noah',    'Roberts',  'Openside Flanker', 7,  'active'),
  ('Ethan',   'Lewis',    'Number 8',         8,  'active'),
  ('Jack',    'Hughes',   'Scrum Half',       9,  'active'),
  ('Alfie',   'Morgan',   'Fly Half',         10, 'active'),
  ('Harry',   'Price',    'Left Wing',        11, 'active'),
  ('Charlie', 'Jones',    'Inside Centre',    12, 'active'),
  ('George',  'Phillips', 'Outside Centre',   13, 'active'),
  ('Freddie', 'Davies',   'Right Wing',       14, 'active'),
  ('Arthur',  'Evans',    'Fullback',         15, 'active'),
  ('Toby',    'Clarke',   'Lock',             NULL, 'injured')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

INSERT INTO events (title, event_type, event_date, location) VALUES
  ('Tuesday Training',   'training', NOW() + INTERVAL '2 days',  'Caerphilly RFC Training Ground'),
  ('League Match vs Bargoed RFC', 'match', NOW() + INTERVAL '5 days', 'Virginia Park, Caerphilly'),
  ('Thursday Training',  'training', NOW() + INTERVAL '4 days',  'Caerphilly RFC Training Ground'),
  ('Pre-Season Training', 'training', NOW() - INTERVAL '7 days', 'Caerphilly RFC Training Ground')
ON CONFLICT DO NOTHING;
