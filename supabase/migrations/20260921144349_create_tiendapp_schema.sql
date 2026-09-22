/*
# TiendApp - Database Schema for Store Management

## Overview
Complete schema for a multi-tenant store management app for Colombian neighborhood shops.
Each user owns a store and can only access their own store's data.

## New Tables
1. `stores` - Store information (name, contact, preferences)
2. `categories` - Product categories per store
3. `products` - Inventory items with purchase/sale prices, stock, min stock, expiry
4. `suppliers` - Supplier contact info and products supplied
5. `customers` - Customer info with outstanding balances
6. `sales` - Sales records with payment method, total, discount
7. `sale_items` - Line items per sale (product, qty, unit price, subtotal)
8. `purchases` - Merchandise purchases from suppliers
9. `purchase_items` - Line items per purchase
10. `expenses` - Store expenses (rent, utilities, etc.)
11. `debts` - Credit sales (fiados) associated with customers
12. `debt_payments` - Payments/abonos on debts
13. `promotions` - Marketing promotions on products
14. `notifications` - System alerts and notifications
15. `store_members` - Multi-user roles per store (owner, employee)

## Security
- RLS enabled on all tables
- All tables scoped by store ownership via auth.uid()
- Owner columns default to auth.uid()
- Store members can access store data based on membership

## Important Notes
1. All monetary values use numeric(12,2) for Colombian pesos
2. Dates use timestamptz with defaults
3. Foreign keys use ON DELETE CASCADE for child tables
4. Store members table enables multiple users per store with roles
*/

-- ============================================
-- STORES
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  phone text,
  email text,
  address text,
  city text,
  currency text NOT NULL DEFAULT 'COP',
  low_stock_threshold int NOT NULL DEFAULT 5,
  expiry_alert_days int NOT NULL DEFAULT 7,
  notify_low_stock boolean NOT NULL DEFAULT true,
  notify_expiry boolean NOT NULL DEFAULT true,
  notify_debts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_stores" ON stores;
CREATE POLICY "select_own_stores" ON stores FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_stores" ON stores;
CREATE POLICY "insert_own_stores" ON stores FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_stores" ON stores;
CREATE POLICY "update_own_stores" ON stores FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_stores" ON stores;
CREATE POLICY "delete_own_stores" ON stores FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============================================
-- STORE MEMBERS (multi-user per store)
-- ============================================
CREATE TABLE IF NOT EXISTS store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'manager', 'employee')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_store_members" ON store_members;
CREATE POLICY "select_own_store_members" ON store_members FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM stores WHERE stores.id = store_members.store_id AND stores.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_store_members" ON store_members;
CREATE POLICY "insert_own_store_members" ON store_members FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores WHERE stores.id = store_members.store_id AND stores.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_store_members" ON store_members;
CREATE POLICY "update_own_store_members" ON store_members FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM stores WHERE stores.id = store_members.store_id AND stores.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores WHERE stores.id = store_members.store_id AND stores.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_store_members" ON store_members;
CREATE POLICY "delete_own_store_members" ON store_members FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM stores WHERE stores.id = store_members.store_id AND stores.owner_id = auth.uid()
    )
  );

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#10B981',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = categories.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = categories.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_categories" ON categories;
CREATE POLICY "insert_own_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = categories.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = categories.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_categories" ON categories;
CREATE POLICY "update_own_categories" ON categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = categories.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = categories.store_id AND store_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = categories.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = categories.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "delete_own_categories" ON categories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = categories.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = categories.store_id AND store_members.user_id = auth.uid())
  );

-- ============================================
-- SUPPLIERS
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  phone text,
  email text,
  address text,
  products_supplied text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_suppliers" ON suppliers;
CREATE POLICY "select_own_suppliers" ON suppliers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = suppliers.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = suppliers.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_suppliers" ON suppliers;
CREATE POLICY "insert_own_suppliers" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = suppliers.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = suppliers.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_suppliers" ON suppliers;
CREATE POLICY "update_own_suppliers" ON suppliers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = suppliers.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = suppliers.store_id AND store_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = suppliers.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = suppliers.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_suppliers" ON suppliers;
CREATE POLICY "delete_own_suppliers" ON suppliers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = suppliers.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = suppliers.store_id AND store_members.user_id = auth.uid())
  );

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  outstanding_balance numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_customers" ON customers;
CREATE POLICY "select_own_customers" ON customers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = customers.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = customers.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_customers" ON customers;
CREATE POLICY "insert_own_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = customers.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = customers.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_customers" ON customers;
CREATE POLICY "update_own_customers" ON customers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = customers.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = customers.store_id AND store_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = customers.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = customers.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_customers" ON customers;
CREATE POLICY "delete_own_customers" ON customers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = customers.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = customers.store_id AND store_members.user_id = auth.uid())
  );

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  barcode text,
  purchase_price numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2) NOT NULL DEFAULT 0,
  stock numeric(12,2) NOT NULL DEFAULT 0,
  min_stock numeric(12,2) NOT NULL DEFAULT 5,
  unit text NOT NULL DEFAULT 'unidad',
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  expiry_date date,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_products" ON products;
CREATE POLICY "select_own_products" ON products FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = products.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_products" ON products;
CREATE POLICY "insert_own_products" ON products FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = products.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_products" ON products;
CREATE POLICY "update_own_products" ON products FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = products.store_id AND store_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = products.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_products" ON products;
CREATE POLICY "delete_own_products" ON products FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = products.store_id AND store_members.user_id = auth.uid())
  );

-- ============================================
-- SALES
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata', 'fiado', 'otro')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  notes text,
  sale_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sales" ON sales;
CREATE POLICY "select_own_sales" ON sales FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = sales.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = sales.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_sales" ON sales;
CREATE POLICY "insert_own_sales" ON sales FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = sales.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = sales.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_sales" ON sales;
CREATE POLICY "update_own_sales" ON sales FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = sales.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = sales.store_id AND store_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = sales.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = sales.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_sales" ON sales;
CREATE POLICY "delete_own_sales" ON sales FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = sales.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = sales.store_id AND store_members.user_id = auth.uid())
  );

-- ============================================
-- SALE ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sale_items" ON sale_items;
CREATE POLICY "select_own_sale_items" ON sale_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM sales
      JOIN stores ON stores.id = sales.store_id
      WHERE sales.id = sale_items.sale_id AND stores.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM sales
      JOIN store_members ON store_members.store_id = sales.store_id
      WHERE sales.id = sale_items.sale_id AND store_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_sale_items" ON sale_items;
CREATE POLICY "insert_own_sale_items" ON sale_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      JOIN stores ON stores.id = sales.store_id
      WHERE sales.id = sale_items.sale_id AND stores.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM sales
      JOIN store_members ON store_members.store_id = sales.store_id
      WHERE sales.id = sale_items.sale_id AND store_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_sale_items" ON sale_items;
CREATE POLICY "update_own_sale_items" ON sale_items FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM sales
      JOIN stores ON stores.id = sales.store_id
      WHERE sales.id = sale_items.sale_id AND stores.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      JOIN stores ON stores.id = sales.store_id
      WHERE sales.id = sale_items.sale_id AND stores.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_sale_items" ON sale_items;
CREATE POLICY "delete_own_sale_items" ON sale_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM sales
      JOIN stores ON stores.id = sales.store_id
      WHERE sales.id = sale_items.sale_id AND stores.owner_id = auth.uid()
    )
  );

-- ============================================
-- PURCHASES
-- ============================================
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  total numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  purchase_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_purchases" ON purchases;
CREATE POLICY "select_own_purchases" ON purchases FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = purchases.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = purchases.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_purchases" ON purchases;
CREATE POLICY "insert_own_purchases" ON purchases FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = purchases.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = purchases.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_purchases" ON purchases;
CREATE POLICY "update_own_purchases" ON purchases FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = purchases.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = purchases.store_id AND store_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = purchases.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = purchases.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_purchases" ON purchases;
CREATE POLICY "delete_own_purchases" ON purchases FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = purchases.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = purchases.store_id AND store_members.user_id = auth.uid())
  );

-- ============================================
-- PURCHASE ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_purchase_items" ON purchase_items;
CREATE POLICY "select_own_purchase_items" ON purchase_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM purchases
      JOIN stores ON stores.id = purchases.store_id
      WHERE purchases.id = purchase_items.purchase_id AND stores.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM purchases
      JOIN store_members ON store_members.store_id = purchases.store_id
      WHERE purchases.id = purchase_items.purchase_id AND store_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_purchase_items" ON purchase_items;
CREATE POLICY "insert_own_purchase_items" ON purchase_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchases
      JOIN stores ON stores.id = purchases.store_id
      WHERE purchases.id = purchase_items.purchase_id AND stores.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM purchases
      JOIN store_members ON store_members.store_id = purchases.store_id
      WHERE purchases.id = purchase_items.purchase_id AND store_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_purchase_items" ON purchase_items;
CREATE POLICY "update_own_purchase_items" ON purchase_items FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM purchases
      JOIN stores ON stores.id = purchases.store_id
      WHERE purchases.id = purchase_items.purchase_id AND stores.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchases
      JOIN stores ON stores.id = purchases.store_id
      WHERE purchases.id = purchase_items.purchase_id AND stores.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_purchase_items" ON purchase_items;
CREATE POLICY "delete_own_purchase_items" ON purchase_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM purchases
      JOIN stores ON stores.id = purchases.store_id
      WHERE purchases.id = purchase_items.purchase_id AND stores.owner_id = auth.uid()
    )
  );

-- ============================================
-- EXPENSES
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'otros' CHECK (category IN ('mercancia', 'arriendo', 'servicios', 'transporte', 'mantenimiento', 'administrativos', 'salarios', 'otros')),
  description text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  expense_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  purchase_id uuid REFERENCES purchases(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_expenses" ON expenses;
CREATE POLICY "select_own_expenses" ON expenses FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = expenses.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = expenses.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_expenses" ON expenses;
CREATE POLICY "insert_own_expenses" ON expenses FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = expenses.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = expenses.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_expenses" ON expenses;
CREATE POLICY "update_own_expenses" ON expenses FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = expenses.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = expenses.store_id AND store_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = expenses.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = expenses.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_expenses" ON expenses;
CREATE POLICY "delete_own_expenses" ON expenses FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = expenses.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = expenses.store_id AND store_members.user_id = auth.uid())
  );

-- ============================================
-- DEBTS (FIADOS)
-- ============================================
CREATE TABLE IF NOT EXISTS debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  original_amount numeric(12,2) NOT NULL DEFAULT 0,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  description text,
  debt_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_debts" ON debts;
CREATE POLICY "select_own_debts" ON debts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = debts.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = debts.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_debts" ON debts;
CREATE POLICY "insert_own_debts" ON debts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = debts.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = debts.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_debts" ON debts;
CREATE POLICY "update_own_debts" ON debts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = debts.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = debts.store_id AND store_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = debts.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = debts.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_debts" ON debts;
CREATE POLICY "delete_own_debts" ON debts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = debts.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = debts.store_id AND store_members.user_id = auth.uid())
  );

-- ============================================
-- DEBT PAYMENTS (ABONOS)
-- ============================================
CREATE TABLE IF NOT EXISTS debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'efectivo',
  payment_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_debt_payments" ON debt_payments;
CREATE POLICY "select_own_debt_payments" ON debt_payments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM debts
      JOIN stores ON stores.id = debts.store_id
      WHERE debts.id = debt_payments.debt_id AND stores.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM debts
      JOIN store_members ON store_members.store_id = debts.store_id
      WHERE debts.id = debt_payments.debt_id AND store_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_debt_payments" ON debt_payments;
CREATE POLICY "insert_own_debt_payments" ON debt_payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM debts
      JOIN stores ON stores.id = debts.store_id
      WHERE debts.id = debt_payments.debt_id AND stores.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM debts
      JOIN store_members ON store_members.store_id = debts.store_id
      WHERE debts.id = debt_payments.debt_id AND store_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_debt_payments" ON debt_payments;
CREATE POLICY "update_own_debt_payments" ON debt_payments FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM debts
      JOIN stores ON stores.id = debts.store_id
      WHERE debts.id = debt_payments.debt_id AND stores.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM debts
      JOIN stores ON stores.id = debts.store_id
      WHERE debts.id = debt_payments.debt_id AND stores.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_debt_payments" ON debt_payments;
CREATE POLICY "delete_own_debt_payments" ON debt_payments FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM debts
      JOIN stores ON stores.id = debts.store_id
      WHERE debts.id = debt_payments.debt_id AND stores.owner_id = auth.uid()
    )
  );

-- ============================================
-- PROMOTIONS (MARKETING)
-- ============================================
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  promo_price numeric(12,2) NOT NULL DEFAULT 0,
  original_price numeric(12,2) NOT NULL DEFAULT 0,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL DEFAULT now() + interval '7 days',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'paused')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_promotions" ON promotions;
CREATE POLICY "select_own_promotions" ON promotions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = promotions.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = promotions.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_promotions" ON promotions;
CREATE POLICY "insert_own_promotions" ON promotions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = promotions.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = promotions.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_promotions" ON promotions;
CREATE POLICY "update_own_promotions" ON promotions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = promotions.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = promotions.store_id AND store_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = promotions.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = promotions.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_promotions" ON promotions;
CREATE POLICY "delete_own_promotions" ON promotions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = promotions.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = promotions.store_id AND store_members.user_id = auth.uid())
  );

-- ============================================
-- NOTIFICATIONS / ALERTS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('low_stock', 'out_of_stock', 'expiry', 'debt', 'high_expense', 'sales_drop', 'info')),
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
  related_id uuid,
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = notifications.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = notifications.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = notifications.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = notifications.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = notifications.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = notifications.store_id AND store_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = notifications.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = notifications.store_id AND store_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = notifications.store_id AND stores.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM store_members WHERE store_members.store_id = notifications.store_id and store_members.user_id = auth.uid())
  );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_store_id ON purchases(store_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_expenses_store_id ON expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_debts_store_id ON debts(store_id);
CREATE INDEX IF NOT EXISTS idx_debts_customer_id ON debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_store_id ON suppliers(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_notifications_store_id ON notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_promotions_store_id ON promotions(store_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store_id ON store_members(store_id);
CREATE INDEX IF NOT EXISTS idx_store_members_user_id ON store_members(user_id);