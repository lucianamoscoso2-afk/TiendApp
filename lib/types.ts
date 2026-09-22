export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'nequi' | 'daviplata' | 'fiado' | 'otro';
export type SaleStatus = 'completed' | 'cancelled';
export type DebtStatus = 'pending' | 'paid' | 'cancelled';
export type PromotionStatus = 'active' | 'expired' | 'paused';
export type UserRole = 'owner' | 'manager' | 'employee';
export type ExpenseCategory = 'mercancia' | 'arriendo' | 'servicios' | 'transporte' | 'mantenimiento' | 'administrativos' | 'salarios' | 'otros';
export type NotificationType = 'low_stock' | 'out_of_stock' | 'expiry' | 'debt' | 'high_expense' | 'sales_drop' | 'info';
export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  currency: string;
  low_stock_threshold: number;
  expiry_alert_days: number;
  notify_low_stock: boolean;
  notify_expiry: boolean;
  notify_debts: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  store_id: string;
  name: string;
  description?: string | null;
  color: string;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  category_id?: string | null;
  name: string;
  code?: string | null;
  barcode?: string | null;
  purchase_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  supplier_id?: string | null;
  expiry_date?: string | null;
  image_url?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
}

export interface Supplier {
  id: string;
  store_id: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  products_supplied?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  store_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  outstanding_balance: number;
  created_at: string;
}

export interface Sale {
  id: string;
  store_id: string;
  customer_id?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  notes?: string | null;
  sale_date: string;
  created_at: string;
  customer?: Customer | null;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  store_id: string;
  supplier_id?: string | null;
  total: number;
  notes?: string | null;
  purchase_date: string;
  created_at: string;
  supplier?: Supplier | null;
  purchase_items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface Expense {
  id: string;
  store_id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  notes?: string | null;
  purchase_id?: string | null;
  created_at: string;
}

export interface Debt {
  id: string;
  store_id: string;
  customer_id: string;
  sale_id?: string | null;
  original_amount: number;
  balance: number;
  status: DebtStatus;
  description?: string | null;
  debt_date: string;
  created_at: string;
  customer?: Customer | null;
  debt_payments?: DebtPayment[];
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string | null;
  created_at: string;
}

export interface Promotion {
  id: string;
  store_id: string;
  product_id?: string | null;
  title: string;
  description?: string | null;
  promo_price: number;
  original_price: number;
  start_date: string;
  end_date: string;
  status: PromotionStatus;
  created_at: string;
  product?: Product | null;
}

export interface Notification {
  id: string;
  store_id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  related_id?: string | null;
  reviewed: boolean;
  created_at: string;
}

export interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}
