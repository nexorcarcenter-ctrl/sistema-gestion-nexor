-- Compras a credito y cotizacion del dolar.
--
-- Una compra puede ser de contado o a credito (a X dias). El stock entra el
-- dia de la compra en los dos casos; lo que cambia es el gasto: cuenta
-- cuando la plata sale, o sea en cada pago. Una compra de contado es una
-- compra con un unico pago el mismo dia.

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'contado';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS credit_days INTEGER DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS due_date DATE;
-- Cuanto se pago, en la moneda de la compra
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;

CREATE TABLE IF NOT EXISTS purchase_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- En la moneda de la compra: una deuda en dolares se paga en dolares
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'UYU',
  -- Cotizacion del dia del pago, no la de la compra: es cuando sale la plata
  exchange_rate NUMERIC DEFAULT 1,
  amount_uyu NUMERIC NOT NULL DEFAULT 0,
  payment_method_id TEXT,
  payment_method_name TEXT,
  expense_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pp_order ON purchase_payments(purchase_order_id);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS purchase_payment_id TEXT;

-- Las compras registradas antes de esto eran todas de contado y tienen un
-- solo gasto: se les crea el pago que les corresponde, para que todas las
-- compras se lean igual.
INSERT INTO purchase_payments (purchase_order_id, payment_date, amount, currency, exchange_rate,
  amount_uyu, payment_method_id, payment_method_name, expense_id, created_by, created_by_name)
SELECT o.id::text, COALESCE(o.order_date, o.created_at::date), o.total, COALESCE(o.currency, 'UYU'),
       COALESCE(o.exchange_rate, 1), COALESCE(o.total_uyu, o.total), o.payment_method_id,
       o.payment_method_name, o.expense_id, o.created_by, o.created_by_name
FROM purchase_orders o
WHERE o.status = 'received' AND o.expense_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM purchase_payments p WHERE p.purchase_order_id = o.id::text);

UPDATE purchase_orders o SET paid_amount = o.total, payment_status = 'paid'
WHERE o.status = 'received' AND o.expense_id IS NOT NULL AND COALESCE(o.paid_amount, 0) = 0;

UPDATE expenses e SET purchase_payment_id = p.id::text
FROM purchase_payments p
WHERE p.expense_id = e.id::text AND e.purchase_payment_id IS NULL;

-- Cotizacion del dolar. Se guarda cada consulta que cambia el valor: sirve
-- para ver de donde salio el tipo de cambio de una compra vieja.
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency TEXT NOT NULL DEFAULT 'USD',
  buy NUMERIC,
  sell NUMERIC NOT NULL,
  source TEXT,
  source_updated_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched ON exchange_rates(fetched_at DESC);
