-- Gastos de la empresa: alquiler, sueldos, servicios, impuestos.
--
-- Va aparte de cash_movements a proposito. Aquella tabla registra plata que
-- entra o sale de la caja del mostrador durante un turno, y esta atada a una
-- sesion de caja abierta. El alquiler se paga por transferencia un dia que la
-- caja ni se abrio: mezclarlos impediria cargar gastos sin caja abierta y
-- descuadraria el arqueo con plata que nunca paso por ahi.

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id TEXT,
  -- El nombre se guarda junto al gasto: si mañana se renombra o archiva la
  -- categoria, el historial sigue diciendo que era. Mismo criterio que usan
  -- las ventas con product_name.
  category_name TEXT,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'UYU',
  exchange_rate NUMERIC DEFAULT 1,
  -- Equivalente en pesos, calculado al momento de cargarlo. Es la columna que
  -- suman los reportes, igual que sales.total.
  amount_uyu NUMERIC NOT NULL DEFAULT 0,
  payment_method_id TEXT,
  payment_method_name TEXT,
  supplier_name TEXT,
  -- Marca los que se repiten todos los meses, para poder copiarlos
  is_fixed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_by TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);

-- Categorias iniciales. El INSERT ... WHERE NOT EXISTS deja correr esto en
-- cada arranque sin duplicar, y no repone las que el usuario haya borrado.
INSERT INTO expense_categories (name, sort_order)
SELECT * FROM (VALUES
  ('Alquiler', 1),
  ('Sueldos', 2),
  ('Servicios', 3),
  ('Impuestos', 4),
  ('Mantenimiento', 5),
  ('Herramientas', 6),
  ('Marketing', 7),
  ('Fletes', 8),
  ('Otros', 99)
) AS nuevas(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM expense_categories);
