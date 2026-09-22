import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';
import type {
  Product, Category, Sale, SaleItem, Purchase, Expense,
  Debt, Customer, Supplier, Notification, Promotion, DebtPayment
} from './types';

export function useStoreData() {
  const { store } = useAuth();
  const storeId = store?.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);

    const [productsRes, categoriesRes, salesRes, purchasesRes, expensesRes, debtsRes, customersRes, suppliersRes, notifsRes, promosRes] = await Promise.all([
      supabase.from('products').select('*, category:categories(*)').eq('store_id', storeId).order('name'),
      supabase.from('categories').select('*').eq('store_id', storeId).order('name'),
      supabase.from('sales').select('*, customer:customers(*), sale_items:sale_items(*)').eq('store_id', storeId).order('sale_date', { ascending: false }).limit(500),
      supabase.from('purchases').select('*, supplier:suppliers(*), purchase_items:purchase_items(*)').eq('store_id', storeId).order('purchase_date', { ascending: false }).limit(200),
      supabase.from('expenses').select('*').eq('store_id', storeId).order('expense_date', { ascending: false }).limit(500),
      supabase.from('debts').select('*, customer:customers(*), debt_payments:debt_payments(*)').eq('store_id', storeId).order('debt_date', { ascending: false }),
      supabase.from('customers').select('*').eq('store_id', storeId).order('name'),
      supabase.from('suppliers').select('*').eq('store_id', storeId).order('name'),
      supabase.from('notifications').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(50),
      supabase.from('promotions').select('*, product:products(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
    ]);

    setProducts(productsRes.data as Product[] || []);
    setCategories(categoriesRes.data as Category[] || []);
    setSales(salesRes.data as Sale[] || []);
    setPurchases(purchasesRes.data as Purchase[] || []);
    setExpenses(expensesRes.data as Expense[] || []);
    setDebts(debtsRes.data as Debt[] || []);
    setCustomers(customersRes.data as Customer[] || []);
    setSuppliers(suppliersRes.data as Supplier[] || []);
    setNotifications(notifsRes.data as Notification[] || []);
    setPromotions(promosRes.data as Promotion[] || []);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    store,
    storeId,
    products, setProducts,
    categories, setCategories,
    sales, setSales,
    purchases, setPurchases,
    expenses, setExpenses,
    debts, setDebts,
    customers, setCustomers,
    suppliers, setSuppliers,
    notifications, setNotifications,
    promotions, setPromotions,
    loading,
    refresh: fetchAll,
  };
}

export function useDashboardStats() {
  const { store } = useAuth();
  const { sales, expenses, debts, products } = useStoreData();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const completedSales = sales.filter(s => s.status === 'completed');

  const todaySales = completedSales.filter(s => new Date(s.sale_date) >= today);
  const weekSales = completedSales.filter(s => new Date(s.sale_date) >= startOfWeek);
  const monthSales = completedSales.filter(s => new Date(s.sale_date) >= startOfMonth);

  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
  const weekRevenue = weekSales.reduce((sum, s) => sum + Number(s.total), 0);
  const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.total), 0);

  const todayExpenses = expenses.filter(e => new Date(e.expense_date) >= today).reduce((sum, e) => sum + Number(e.amount), 0);
  const monthExpenses = expenses.filter(e => new Date(e.expense_date) >= startOfMonth).reduce((sum, e) => sum + Number(e.amount), 0);

  const monthProfit = monthRevenue - monthExpenses;

  const itemsSoldToday = todaySales.reduce((sum, s) => {
    return sum + (s.sale_items?.reduce((itemSum, item) => itemSum + Number(item.quantity), 0) || 0);
  }, 0);

  const pendingDebts = debts.filter(d => d.status === 'pending');
  const totalPendingDebts = pendingDebts.reduce((sum, d) => sum + Number(d.balance), 0);

  const lowStockProducts = products.filter(p => p.active && Number(p.stock) <= Number(p.min_stock) && Number(p.stock) > 0);
  const outOfStockProducts = products.filter(p => p.active && Number(p.stock) <= 0);
  const expiringProducts = products.filter(p => {
    if (!p.expiry_date) return false;
    const days = Math.ceil((new Date(p.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days <= (store?.expiry_alert_days || 7) && days >= 0;
  });

  // Last 7 days revenue chart
  const last7Days: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const dayRev = completedSales
      .filter(s => {
        const sd = new Date(s.sale_date);
        return sd >= dayStart && sd < dayEnd;
      })
      .reduce((sum, s) => sum + Number(s.total), 0);

    const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    last7Days.push({ label: labels[dayStart.getDay()], value: dayRev });
  }

  // Last 6 months chart
  const last6Months: { label: string; value: number; value2: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const rev = completedSales
      .filter(s => {
        const sd = new Date(s.sale_date);
        return sd >= monthStart && sd < monthEnd;
      })
      .reduce((sum, s) => sum + Number(s.total), 0);

    const exp = expenses
      .filter(e => {
        const ed = new Date(e.expense_date);
        return ed >= monthStart && ed < monthEnd;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    last6Months.push({ label: monthLabels[monthStart.getMonth()], value: rev, value2: exp });
  }

  return {
    todayRevenue,
    weekRevenue,
    monthRevenue,
    todayExpenses,
    monthExpenses,
    monthProfit,
    itemsSoldToday,
    todaySalesCount: todaySales.length,
    totalPendingDebts,
    pendingDebtsCount: pendingDebts.length,
    lowStockProducts,
    outOfStockProducts,
    expiringProducts,
    last7Days,
    last6Months,
  };
}
