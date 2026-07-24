-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  cargo TEXT DEFAULT 'otro',
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_es TEXT,
  description TEXT,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  product_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  parent_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'net_30',
  notes TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  rating INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  description TEXT,
  category TEXT,
  unit_price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  max_stock INTEGER DEFAULT 100,
  supplier_id TEXT,
  supplier_name TEXT,
  unit TEXT DEFAULT 'unit',
  tax_rate NUMERIC DEFAULT 0,
  image_url TEXT,
  location TEXT,
  status TEXT DEFAULT 'active',
  is_active BOOLEAN DEFAULT TRUE,
  volume_discounts TEXT DEFAULT '[]',
  car_brand TEXT,
  car_model TEXT,
  car_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT,
  product_name TEXT NOT NULL,
  sku TEXT,
  movement_type TEXT DEFAULT 'adjustment',
  quantity INTEGER NOT NULL,
  previous_stock INTEGER DEFAULT 0,
  new_stock INTEGER DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  reference_type TEXT DEFAULT 'manual',
  reference_number TEXT,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL,
  order_date DATE,
  expected_date DATE,
  received_date DATE,
  supplier_id TEXT,
  supplier_name TEXT,
  items_json TEXT DEFAULT '[]',
  items_count INTEGER DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Car Brands
CREATE TABLE IF NOT EXISTS car_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  models_json TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cars
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT,
  plate TEXT,
  vin TEXT,
  mileage NUMERIC DEFAULT 0,
  fuel_type TEXT DEFAULT 'gasoline',
  transmission TEXT DEFAULT 'manual',
  engine_cc NUMERIC,
  doors INTEGER DEFAULT 4,
  body_type TEXT DEFAULT 'sedan',
  condition TEXT DEFAULT 'used',
  purchase_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  supplier_id TEXT,
  supplier_name TEXT,
  status TEXT DEFAULT 'available',
  image_url TEXT,
  features TEXT,
  notes TEXT,
  entry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Types
CREATE TABLE IF NOT EXISTS service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Orders
CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  car_plate TEXT,
  car_brand TEXT,
  car_model TEXT,
  car_year INTEGER,
  car_mileage NUMERIC DEFAULT 0,
  car_color TEXT,
  entry_date DATE,
  delivery_date DATE,
  status TEXT DEFAULT 'pending',
  services TEXT DEFAULT '[]',
  total_sale NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  paid_amount NUMERIC DEFAULT 0,
  sale_id TEXT,
  sale_number TEXT,
  notes TEXT,
  inspection_data TEXT,
  inspection_status TEXT DEFAULT 'pending',
  appointment_time TEXT,
  inspection_observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'UYU',
  type TEXT DEFAULT 'cash',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash Registers
CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  status TEXT DEFAULT 'open',
  opened_at TEXT,
  closed_at TEXT,
  petty_cash_uyu NUMERIC DEFAULT 0,
  petty_cash_usd NUMERIC DEFAULT 0,
  opening_balance_uyu NUMERIC DEFAULT 0,
  opening_balance_usd NUMERIC DEFAULT 0,
  closing_balance_uyu NUMERIC DEFAULT 0,
  closing_balance_usd NUMERIC DEFAULT 0,
  difference_uyu NUMERIC DEFAULT 0,
  difference_usd NUMERIC DEFAULT 0,
  total_uyu NUMERIC DEFAULT 0,
  total_usd NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT NOT NULL,
  sale_date TIMESTAMPTZ,
  sale_type TEXT DEFAULT 'direct',
  service_order_id TEXT,
  service_order_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  vehicle TEXT,
  items_json TEXT DEFAULT '[]',
  items_count INTEGER DEFAULT 0,
  payments_json TEXT DEFAULT '[]',
  total_uyu NUMERIC DEFAULT 0,
  total_usd NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'paid',
  status TEXT DEFAULT 'completed',
  cash_register_id TEXT,
  notes TEXT,
  cashier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id TEXT,
  order_number TEXT,
  cash_register_id TEXT,
  customer_name TEXT,
  car_plate TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'UYU',
  payment_method TEXT DEFAULT 'cash',
  exchange_rate NUMERIC DEFAULT 1,
  amount_uyu_equivalent NUMERIC DEFAULT 0,
  paid_at TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remitos
CREATE TABLE IF NOT EXISTS remitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remito_number TEXT,
  service_order_id TEXT,
  order_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  car_plate TEXT,
  car_brand TEXT,
  car_model TEXT,
  date DATE,
  items TEXT DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  notes TEXT,
  issued_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash Movements (manual ingresos/egresos)
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ingreso', 'egreso')),
  concept TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'UYU',
  moved_at TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_active to users (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Agenda / Turnos
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'turno',
  date DATE NOT NULL,
  time TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  car_plate TEXT,
  car_brand TEXT,
  car_model TEXT,
  service_description TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PIN para caja (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Cajero en caja (idempotent)
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS opened_by TEXT;
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS closed_by TEXT;

-- Cajero en movimientos manuales (idempotent)
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add exit inspection columns (idempotent)
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS car_mileage_exit NUMERIC DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS exit_inspection_data TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS exit_inspection_status TEXT DEFAULT 'pending';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS exit_observations TEXT;
