-- Compra directa: se registra lo comprado y en el mismo paso entra al stock,
-- actualiza el costo del producto y queda anotado como gasto de la empresa.
--
-- purchase_orders ya existia de la version "orden de compra" (borrador,
-- enviada, recibida). Se reutiliza agregando lo que faltaba: moneda, IVA,
-- forma de pago y el vinculo con el gasto que genera.

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'UYU';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0;
-- Equivalente en pesos del total, con el tipo de cambio del dia de la compra.
-- Es lo que suman gastos y reportes, igual que expenses.amount_uyu.
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_uyu NUMERIC DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_method_id TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_method_name TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS expense_id TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Una fila por producto comprado. items_json se sigue llenando para que las
-- pantallas viejas no se rompan, pero las consultas (que se le compro a cada
-- proveedor, quien vendio mas barato) salen de aca: filtrar y agrupar JSON
-- en cada consulta es lento y fragil.
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id TEXT NOT NULL,
  supplier_id TEXT,
  supplier_name TEXT,
  product_id TEXT NOT NULL,
  product_name TEXT,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  -- Costo unitario sin IVA, en la moneda de la compra
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'UYU',
  -- El mismo costo pasado a pesos: permite comparar una compra en dolares
  -- con otra en pesos al buscar el proveedor mas barato
  unit_cost_uyu NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  -- Costo que tenia el producto antes de esta compra. Al anular o editar la
  -- compra se repone, salvo que alguien lo haya cambiado despues a mano.
  previous_cost_price NUMERIC,
  purchase_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poi_order    ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product  ON purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_poi_supplier ON purchase_order_items(supplier_id);

-- Los gastos se dividen en dos tipos: los operativos (alquiler, sueldos,
-- servicios) y las compras de mercaderia. Ambos restan en el resultado neto,
-- pero se muestran por separado para saber siempre de que es cada peso.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type TEXT DEFAULT 'operativo';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS purchase_order_id TEXT;
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);
