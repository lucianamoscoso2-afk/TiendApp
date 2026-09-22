import { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, Button, Input, Select, Badge, EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from '@/lib/format';
import { showSuccess, showError, confirmAction } from '@/lib/alerts';
import type { Product, Sale, Customer } from '@/lib/types';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, X, Receipt,
  Eye, XCircle, Package, Wallet, CheckCircle, ShoppingBag
} from 'lucide-react-native';

interface CartItem {
  product: Product;
  quantity: number;
}

const PAYMENT_METHODS = [
  { label: 'Efectivo', value: 'efectivo', icon: '💵', color: colors.primary[600] },
  { label: 'Tarjeta', value: 'tarjeta', icon: '💳', color: colors.info },
  { label: 'Transferencia', value: 'transferencia', icon: '🏦', color: '#8B5CF6' },
  { label: 'Nequi', value: 'nequi', icon: '📱', color: '#EC4899' },
  { label: 'Daviplata', value: 'daviplata', icon: '📲', color: '#06B6D4' },
  { label: 'Fiado', value: 'fiado', icon: '🤝', color: colors.warning },
  { label: 'Otro', value: 'otro', icon: '📝', color: colors.neutral[500] },
];

export default function SalesScreen() {
  const { store } = useAuth();
  const { products, sales, customers, loading, refresh } = useStoreData();
  const [showPOS, setShowPOS] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const completedSales = sales.filter(s => s.status === 'completed');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySales = completedSales.filter(s => new Date(s.sale_date) >= todayStart);
  const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total), 0);

  const filteredSales = useMemo(() => {
    let result = [...sales];
    if (search) {
      result = result.filter(s =>
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.customer?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filterMethod) {
      result = result.filter(s => s.payment_method === filterMethod);
    }
    if (filterDate) {
      const day = new Date(filterDate);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      result = result.filter(s => {
        const sd = new Date(s.sale_date);
        return sd >= day && sd < nextDay;
      });
    }
    return result;
  }, [sales, search, filterMethod, filterDate]);

  const detailSale = showDetail ? sales.find(s => s.id === showDetail) ?? null : null;

  if (loading) return <Loading message="Cargando ventas..." />;

  const activeProducts = products.filter(p => p.active && Number(p.stock) > 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Ventas"
          subtitle="Registra y consulta tus ventas"
          right={
            <Button onPress={() => setShowPOS(true)} size="md">
              <Plus color={colors.white} size={18} strokeWidth={2.5} />
              <Text style={styles.btnText}>Nueva venta</Text>
            </Button>
          }
        />

        <View style={styles.content}>
          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryIconWrap}>
                <ShoppingBag color={colors.primary[600]} size={18} strokeWidth={2} />
              </View>
              <Text style={styles.summaryLabel}>Ventas de hoy</Text>
              <Text style={styles.summaryValue}>{formatCurrency(todayTotal)}</Text>
              <Text style={styles.summarySub}>{todaySales.length} {todaySales.length === 1 ? 'venta' : 'ventas'} hoy</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <View style={[styles.summaryIconWrap, { backgroundColor: '#DBEAFE' }]}>
                <Wallet color={colors.info} size={18} strokeWidth={2} />
              </View>
              <Text style={styles.summaryLabel}>Total general</Text>
              <Text style={styles.summaryValue}>{formatCurrency(completedSales.reduce((s, sale) => s + Number(sale.total), 0))}</Text>
              <Text style={styles.summarySub}>{completedSales.length} ventas en total</Text>
            </Card>
          </View>

          <Card style={styles.filtersCard}>
            <View style={styles.searchRow}>
              <View style={styles.searchInput}>
                <Search color={colors.textSecondary} size={18} strokeWidth={2} />
                <TextInput
                  style={styles.searchTextInput}
                  placeholder="Buscar por cliente..."
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
            </View>
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Select
                  value={filterMethod}
                  onValueChange={setFilterMethod}
                  placeholder="Todos los métodos"
                  options={PAYMENT_METHODS.map(m => ({ label: m.label, value: m.value }))}
                />
              </View>
              <View style={styles.filterItem}>
                <Input
                  value={filterDate}
                  onChangeText={setFilterDate}
                  placeholder="Filtrar por fecha"
                />
              </View>
            </View>
          </Card>

          {filteredSales.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart color={colors.neutral[300]} size={48} strokeWidth={2} />}
              title="No hay ventas registradas"
              message="Registra tu primera venta para empezar a llevar el control"
              action={
                activeProducts.length === 0 ? (
                  <Text style={styles.noProductsWarn}>Agrega productos al inventario primero</Text>
                ) : (
                  <Button onPress={() => setShowPOS(true)}>Registrar venta</Button>
                )
              }
            />
          ) : (
            <View style={styles.salesList}>
              <Text style={styles.listTitle}>Historial de ventas</Text>
              {filteredSales.map(sale => (
                <Card key={sale.id} style={styles.saleCard} onPress={() => setShowDetail(sale.id)}>
                  <View style={styles.saleRow}>
                    <View style={styles.saleLeft}>
                      <View style={styles.saleIconWrap}>
                        <ShoppingCart color={colors.primary[600]} size={16} strokeWidth={2} />
                      </View>
                      <View style={styles.saleInfo}>
                        <Text style={styles.saleAmount}>{formatCurrency(Number(sale.total))}</Text>
                        <Text style={styles.saleDate}>{formatDateTime(sale.sale_date)}</Text>
                        <View style={styles.saleTags}>
                          <Badge variant="primary" size="sm">{getPaymentMethodLabel(sale.payment_method)}</Badge>
                          {sale.status === 'cancelled' && <Badge variant="error" size="sm">Anulada</Badge>}
                          {sale.payment_method === 'fiado' && <Badge variant="warning" size="sm">Fiado</Badge>}
                        </View>
                      </View>
                    </View>
                    <View style={styles.saleItems}>
                      <Text style={styles.saleItemsCount}>
                        {sale.sale_items?.length || 0} {(sale.sale_items?.length || 0) === 1 ? 'art.' : 'arts.'}
                      </Text>
                      <Eye color={colors.textSecondary} size={18} strokeWidth={2} />
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating register sale button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (activeProducts.length === 0) {
            showError('No tienes productos con inventario. Agrega productos primero.');
            return;
          }
          setShowPOS(true);
        }}
        activeOpacity={0.85}
      >
        <ShoppingCart color={colors.white} size={24} strokeWidth={2.5} />
        <Text style={styles.fabText}>Registrar venta</Text>
      </TouchableOpacity>

      {/* POS Modal */}
      <POSModal
        visible={showPOS}
        onClose={() => setShowPOS(false)}
        products={activeProducts}
        customers={customers}
        storeId={store?.id || ''}
        onSaleComplete={() => {
          refresh();
          setShowPOS(false);
        }}
      />

      {/* Sale detail modal */}
      <SaleDetailModal
        sale={detailSale}
        visible={!!detailSale}
        onClose={() => setShowDetail(null)}
        onVoid={async () => {
          if (!detailSale || !store) return;
          confirmAction(
            '¿Seguro que deseas anular esta venta? El inventario se restaurará.',
            async () => {
              if (detailSale.sale_items) {
                for (const item of detailSale.sale_items) {
                  if (item.product_id) {
                    const product = products.find(p => p.id === item.product_id);
                    if (product) {
                      await supabase
                        .from('products')
                        .update({ stock: Number(product.stock) + Number(item.quantity), updated_at: new Date().toISOString() })
                        .eq('id', product.id);
                    }
                  }
                }
              }
              await supabase.from('sales').update({ status: 'cancelled' }).eq('id', detailSale.id);
              refresh();
              setShowDetail(null);
              showSuccess('Venta anulada correctamente');
            }
          );
        }}
      />
    </View>
  );
}

function POSModal({ visible, onClose, products, customers, storeId, onSaleComplete }: {
  visible: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  storeId: string;
  onSaleComplete: () => void;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successView, setSuccessView] = useState(false);

  // Reset everything when modal opens
  useEffect(() => {
    if (visible) {
      setCart([]);
      setSearch('');
      setDiscount('');
      setPaymentMethod('efectivo');
      setCustomerId('');
      setNotes('');
      setError(null);
      setSuccessView(false);
    }
  }, [visible]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase())
  );

  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.sale_price) * item.quantity, 0);
  const discountAmount = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);

  const addToCart = (product: Product) => {
    setError(null);
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= Number(product.stock)) {
          showError('No hay suficiente inventario de este producto');
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > Number(item.product.stock)) {
          showError('No hay suficiente inventario');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Agrega al menos un producto al carrito');
      return;
    }
    if (discountAmount > subtotal) {
      setError('El descuento no puede ser mayor al subtotal');
      return;
    }
    if (paymentMethod === 'fiado' && !customerId) {
      setError('Selecciona un cliente para la venta fiada');
      return;
    }
    if (!storeId) {
      setError('No se pudo identificar tu tienda');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Create the sale record
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          store_id: storeId,
          customer_id: customerId || null,
          subtotal,
          discount: discountAmount,
          total,
          payment_method: paymentMethod,
          status: 'completed',
          notes: notes || null,
          sale_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (saleError) throw new Error(saleError.message);
      if (!saleData) throw new Error('No se pudo crear la venta');

      // 2. Create sale items
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Number(item.product.sale_price),
        unit_cost: Number(item.product.purchase_price),
        subtotal: Number(item.product.sale_price) * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw new Error(itemsError.message);

      // 3. Update product stock
      for (const item of cart) {
        const newStock = Number(item.product.stock) - item.quantity;
        const { error: stockError } = await supabase
          .from('products')
          .update({
            stock: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.product.id);
        if (stockError) console.error('Stock update error for', item.product.name, stockError);
      }

      // 4. If fiado, create debt record
      if (paymentMethod === 'fiado' && customerId) {
        const { error: debtError } = await supabase.from('debts').insert({
          store_id: storeId,
          customer_id: customerId,
          sale_id: saleData.id,
          original_amount: total,
          balance: total,
          status: 'pending',
          description: `Venta fiada - ${saleItems.length} ${saleItems.length === 1 ? 'artículo' : 'artículos'}`,
        });
        if (debtError) console.error('Debt creation error:', debtError);

        // Update customer balance
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          await supabase
            .from('customers')
            .update({ outstanding_balance: Number(customer.outstanding_balance) + total })
            .eq('id', customerId);
        }
      }

      setSuccessView(true);
      setTimeout(() => {
        onSaleComplete();
      }, 1500);
    } catch (e: any) {
      const msg = e?.message || 'Error desconocido';
      setError('No se pudo registrar la venta: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  if (successView) {
    return (
      <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrap}>
            <CheckCircle color={colors.success} size={64} strokeWidth={2} />
          </View>
          <Text style={styles.successTitle}>Venta registrada</Text>
          <Text style={styles.successText}>La venta se registró correctamente.</Text>
          <Text style={styles.successTotal}>{formatCurrency(total)}</Text>
          <Text style={styles.successItems}>{cart.length} {cart.length === 1 ? 'producto' : 'productos'} - {getPaymentMethodLabel(paymentMethod)}</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.posContainer}
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
      >
        <View style={styles.posHeader}>
          <View style={styles.posHeaderLeft}>
            <View style={styles.posHeaderIcon}>
              <ShoppingCart color={colors.white} size={20} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.posTitle}>Nueva venta</Text>
              <Text style={styles.posSubtitle}>{cart.length} {cart.length === 1 ? 'producto' : 'productos'} en el carrito</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.posClose}>
            <X color={colors.text} size={24} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.posBody}>
          {/* Product search section */}
          <View style={styles.posProducts}>
            <View style={styles.searchBox}>
              <Search color={colors.textSecondary} size={18} strokeWidth={2} />
              <TextInput
                style={styles.searchBoxInput}
                placeholder="Buscar producto por nombre o código..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={colors.neutral[400]}
                autoFocus
              />
            </View>
            <ScrollView style={styles.productList} showsVerticalScrollIndicator={false}>
              {filteredProducts.length === 0 ? (
                <View style={styles.posEmptyState}>
                  <Package color={colors.neutral[300]} size={36} strokeWidth={2} />
                  <Text style={styles.posEmptyText}>
                    {products.length === 0 ? 'No tienes productos con inventario' : 'No se encontraron productos'}
                  </Text>
                </View>
              ) : (
                filteredProducts.map(product => {
                  const inCart = cart.find(item => item.product.id === product.id);
                  return (
                    <TouchableOpacity
                      key={product.id}
                      style={[styles.productItem, inCart && styles.productItemSelected]}
                      onPress={() => addToCart(product)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.productItemInfo}>
                        <Text style={styles.productItemName}>{product.name}</Text>
                        <View style={styles.productItemMeta}>
                          <Text style={styles.productItemPrice}>{formatCurrency(Number(product.sale_price))}</Text>
                          <Text style={styles.productItemStock}>Stock: {Number(product.stock)}</Text>
                        </View>
                      </View>
                      {inCart ? (
                        <View style={styles.inCartBadge}>
                          <CheckCircle color={colors.white} size={14} strokeWidth={2.5} />
                          <Text style={styles.inCartText}>{inCart.quantity}</Text>
                        </View>
                      ) : (
                        <View style={styles.addBtn}>
                          <Plus color={colors.primary[600]} size={20} strokeWidth={2.5} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Cart section */}
          <View style={styles.posCart}>
            <ScrollView style={styles.cartScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.cartTitle}>Carrito</Text>

              {cart.length === 0 ? (
                <View style={styles.cartEmpty}>
                  <ShoppingCart color={colors.neutral[200]} size={40} strokeWidth={2} />
                  <Text style={styles.cartEmptyText}>Toca los productos para agregarlos</Text>
                </View>
              ) : (
                <View style={styles.cartList}>
                  {cart.map(item => (
                    <View key={item.product.id} style={styles.cartItem}>
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName} numberOfLines={2}>{item.product.name}</Text>
                        <Text style={styles.cartItemPrice}>{formatCurrency(Number(item.product.sale_price))} c/u</Text>
                        <Text style={styles.cartItemSubtotal}>{formatCurrency(Number(item.product.sale_price) * item.quantity)}</Text>
                      </View>
                      <View style={styles.cartItemControls}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, -1)}>
                          <Minus color={colors.text} size={14} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, 1)}>
                          <Plus color={colors.text} size={14} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeFromCart(item.product.id)} style={styles.removeBtn}>
                          <Trash2 color={colors.error} size={16} strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Payment method selection */}
              {cart.length > 0 && (
                <View style={styles.paymentSection}>
                  <Text style={styles.paymentLabel}>Método de pago</Text>
                  <View style={styles.payMethodsGrid}>
                    {PAYMENT_METHODS.map(m => (
                      <TouchableOpacity
                        key={m.value}
                        style={[styles.payMethodBtn, paymentMethod === m.value && styles.payMethodBtnActive]}
                        onPress={() => { setPaymentMethod(m.value); setError(null); }}
                      >
                        <Text style={styles.payMethodIcon}>{m.icon}</Text>
                        <Text style={[styles.payMethodText, paymentMethod === m.value && styles.payMethodTextActive]}>{m.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {paymentMethod === 'fiado' && (
                    <Select
                      label="Cliente (fiado)"
                      value={customerId}
                      onValueChange={(v) => { setCustomerId(v); setError(null); }}
                      placeholder="Seleccionar cliente"
                      options={customers.map(c => ({ label: c.name, value: c.id }))}
                    />
                  )}

                  <Input
                    label="Descuento (opcional)"
                    value={discount}
                    onChangeText={setDiscount}
                    placeholder="0"
                    keyboardType="numeric"
                  />

                  <Input
                    label="Notas (opcional)"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Observaciones..."
                    multiline
                  />

                  {/* Totals */}
                  <View style={styles.totalsBox}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Subtotal</Text>
                      <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
                    </View>
                    {discountAmount > 0 && (
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Descuento</Text>
                        <Text style={[styles.totalValue, { color: colors.error }]}>-{formatCurrency(discountAmount)}</Text>
                      </View>
                    )}
                    <View style={styles.grandTotalRow}>
                      <Text style={styles.grandTotalLabel}>Total a cobrar</Text>
                      <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
                    </View>
                  </View>

                  {error && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.checkoutBtn}
                    onPress={handleCheckout}
                    disabled={saving || cart.length === 0}
                    activeOpacity={0.8}
                  >
                    {saving ? (
                      <Text style={styles.checkoutBtnText}>Registrando...</Text>
                    ) : (
                      <>
                        <CheckCircle color={colors.white} size={22} strokeWidth={2.5} />
                        <Text style={styles.checkoutBtnText}>Registrar venta - {formatCurrency(total)}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SaleDetailModal({ sale, visible, onClose, onVoid }: {
  sale: Sale | null;
  visible: boolean;
  onClose: () => void;
  onVoid: () => void;
}) {
  if (!sale) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.detailPanel}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>Detalle de venta</Text>
            <TouchableOpacity onPress={onClose} style={styles.posClose}>
              <X color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Fecha</Text>
              <Text style={styles.detailInfoValue}>{formatDateTime(sale.sale_date)}</Text>
            </View>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Método de pago</Text>
              <Text style={styles.detailInfoValue}>{getPaymentMethodLabel(sale.payment_method)}</Text>
            </View>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Estado</Text>
              <Badge variant={sale.status === 'completed' ? 'success' : 'error'} size="sm">
                {sale.status === 'completed' ? 'Completada' : 'Anulada'}
              </Badge>
            </View>
            {sale.customer && (
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Cliente</Text>
                <Text style={styles.detailInfoValue}>{sale.customer.name}</Text>
              </View>
            )}

            <Text style={styles.detailSectionTitle}>Artículos</Text>
            {(sale.sale_items || []).map(item => (
              <View key={item.id} style={styles.detailItem}>
                <View style={styles.detailItemInfo}>
                  <Text style={styles.detailItemName}>{item.product_name}</Text>
                  <Text style={styles.detailItemQty}>
                    {item.quantity} x {formatCurrency(Number(item.unit_price))}
                  </Text>
                </View>
                <Text style={styles.detailItemTotal}>{formatCurrency(Number(item.subtotal))}</Text>
              </View>
            ))}

            <View style={styles.detailTotals}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatCurrency(Number(sale.subtotal))}</Text>
              </View>
              {Number(sale.discount) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Descuento</Text>
                  <Text style={[styles.totalValue, { color: colors.error }]}>-{formatCurrency(Number(sale.discount))}</Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(Number(sale.total))}</Text>
              </View>
            </View>

            {sale.notes && (
              <View style={styles.detailNotes}>
                <Text style={styles.detailNotesLabel}>Notas</Text>
                <Text style={styles.detailNotesText}>{sale.notes}</Text>
              </View>
            )}

            {sale.status === 'completed' && (
              <Button onPress={onVoid} variant="danger" size="md" fullWidth>
                <XCircle color={colors.white} size={18} strokeWidth={2} />
                <Text style={{ color: colors.white }}>Anular venta</Text>
              </Button>
            )}
          </ScrollView>
        </View>
        <View style={styles.modalBackdrop} />
      </View>
    </Modal>
  );
}

const { width: screenWidth } = Dimensions.get('window');
const isWide = Platform.OS === 'web' && screenWidth > 700;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { maxWidth: 900, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  btnText: { color: colors.white, fontFamily: typography.fontFamilyBold, fontSize: 15 },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1 },
  summaryIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xs },
  summaryLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  summaryValue: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text, marginTop: 2 },
  summarySub: { fontSize: typography.caption, color: colors.neutral[400], fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  filtersCard: { marginBottom: spacing.md },
  searchRow: { marginBottom: spacing.sm },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.white },
  searchTextInput: { flex: 1, fontSize: typography.body, color: colors.text, fontFamily: typography.fontFamilyRegular },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterItem: { flex: 1 },
  salesList: { gap: spacing.sm },
  listTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: spacing.xs },
  saleCard: {},
  saleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  saleIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  saleInfo: { flex: 1 },
  saleAmount: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  saleDate: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  saleTags: { flexDirection: 'row', gap: 6, marginTop: 6 },
  saleItems: { alignItems: 'flex-end', gap: 6 },
  saleItemsCount: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  noProductsWarn: { fontSize: typography.bodySmall, color: colors.warning, fontFamily: typography.fontFamilyMedium, textAlign: 'center' },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary[600],
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 30,
    ...shadows.lg,
    elevation: 8,
  },
  fabText: { color: colors.white, fontSize: typography.body, fontFamily: typography.fontFamilyBold },
  // POS
  posContainer: { flex: 1, backgroundColor: colors.background },
  posHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  posHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  posHeaderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center' },
  posTitle: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text },
  posSubtitle: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  posClose: { padding: spacing.xs },
  posBody: { flex: 1, flexDirection: isWide ? 'row' : 'column', maxWidth: 1200, width: '100%', alignSelf: 'center' },
  posProducts: { flex: 1, padding: spacing.md, borderRightWidth: isWide ? 1 : 0, borderRightColor: colors.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 2, borderColor: colors.primary[200], borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, backgroundColor: colors.white, ...shadows.sm },
  searchBoxInput: { flex: 1, fontSize: typography.body, color: colors.text, fontFamily: typography.fontFamilyRegular },
  productList: { marginTop: spacing.sm },
  productItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, marginBottom: spacing.sm, ...shadows.sm, borderWidth: 2, borderColor: 'transparent' },
  productItemSelected: { borderColor: colors.primary[500], backgroundColor: colors.primary[50] },
  productItemInfo: { flex: 1 },
  productItemName: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  productItemMeta: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  productItemPrice: { fontSize: typography.caption, color: colors.primary[700], fontFamily: typography.fontFamilyBold },
  productItemStock: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  inCartBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary[600], paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  inCartText: { color: colors.white, fontSize: typography.caption, fontFamily: typography.fontFamilyBold },
  posEmptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  posEmptyText: { color: colors.textSecondary, fontSize: typography.bodySmall, fontFamily: typography.fontFamilyRegular, textAlign: 'center' },
  // Cart
  posCart: { flex: 1, padding: spacing.md, maxWidth: isWide ? 420 : '100%', backgroundColor: colors.card },
  cartScroll: { flex: 1 },
  cartTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: spacing.sm },
  cartEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  cartEmptyText: { color: colors.textSecondary, fontSize: typography.bodySmall, fontFamily: typography.fontFamilyRegular, textAlign: 'center' },
  cartList: { gap: spacing.sm },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.neutral[50], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  cartItemPrice: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  cartItemSubtotal: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.primary[700], marginTop: 2 },
  cartItemControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  qtyText: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text, minWidth: 24, textAlign: 'center' },
  removeBtn: { padding: 6, marginLeft: 4 },
  // Payment
  paymentSection: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  paymentLabel: { fontSize: typography.bodySmall, color: colors.text, fontFamily: typography.fontFamilyBold, marginBottom: spacing.sm },
  payMethodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  payMethodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.neutral[50], borderWidth: 2, borderColor: colors.border },
  payMethodBtnActive: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
  payMethodIcon: { fontSize: 16 },
  payMethodText: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyMedium },
  payMethodTextActive: { color: colors.primary[700], fontFamily: typography.fontFamilyBold },
  // Totals
  totalsBox: { backgroundColor: colors.neutral[50], borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  totalValue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs, paddingTop: spacing.sm },
  grandTotalLabel: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  grandTotalValue: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.primary[700] },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  errorText: { color: '#991B1B', fontSize: typography.bodySmall, fontFamily: typography.fontFamilyRegular },
  // Checkout button
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[600],
    paddingVertical: 16,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    ...shadows.md,
  },
  checkoutBtnText: { color: colors.white, fontSize: typography.h4, fontFamily: typography.fontFamilyBold },
  // Success view
  successContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  successIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  successTitle: { fontSize: 28, fontFamily: typography.fontFamilyBold, color: colors.text },
  successText: { fontSize: typography.body, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: spacing.sm },
  successTotal: { fontSize: 32, fontFamily: typography.fontFamilyBold, color: colors.primary[700], marginTop: spacing.lg },
  successItems: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: spacing.xs },
  // Detail modal
  modalOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  detailPanel: { width: 440, maxWidth: '90%', backgroundColor: colors.card, ...shadows.lg },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  detailBody: { flex: 1, padding: spacing.lg },
  detailInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailInfoLabel: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  detailInfoValue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  detailSectionTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailItemInfo: { flex: 1 },
  detailItemName: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  detailItemQty: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  detailItemTotal: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  detailTotals: { marginTop: spacing.lg, marginBottom: spacing.lg },
  detailNotes: { backgroundColor: colors.neutral[50], borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  detailNotesLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyBold, marginBottom: 4 },
  detailNotesText: { fontSize: typography.bodySmall, color: colors.text, fontFamily: typography.fontFamilyRegular },
});
