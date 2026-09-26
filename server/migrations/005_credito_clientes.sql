-- Ventas directas a credito.
--
-- Hasta ahora el cliente era un texto suelto en cada venta u orden. Para
-- saber cuanto debe cada uno hace falta una ficha: se crea al vender a
-- credito y despues se reutiliza.
--
-- El ingreso de una venta a credito cuenta cuando se cobra, igual que el
-- gasto de una compra cuenta cuando se paga: entra por la tabla payments,
-- con la fecha de cada cobro.

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  -- RUT o cedula
  tax_id TEXT,
  email TEXT,
  address TEXT,
  -- Plazo habitual: se propone al venderle a credito
  credit_days INTEGER DEFAULT 30,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(LOWER(name));

ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'contado';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS credit_days INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS due_date DATE;
-- Cuanto se cobro de una venta a credito, en pesos
ALTER TABLE sales ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_type ON sales(payment_type);

-- payments era solo de ordenes de servicio. Los cobros de ventas a credito
-- van a la misma tabla: la caja ya arma el arqueo desde aca, asi que un
-- cobro en efectivo aparece en la caja sin tocar esa pantalla.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS sale_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by_name TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
