import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Dimensions, Platform } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, Button, Input, Select, Badge, EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { formatCurrency, formatDateTime, formatDateInput } from '@/lib/format';
import { showSuccess, showError, confirmAction } from '@/lib/alerts';
import type { Product, Supplier, Purchase } from '@/lib/types';
import {
  Truck, Plus, Minus, Trash2, X, Search, Eye,
  XCircle, Package
} from 'lucide-react-native';

interface PurchaseCartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export default function PurchasesScreen() {
  const { store } = useAuth();
  const { purchases, products, suppliers, loading, refresh, storeId } = useStoreData();
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // This-month summary
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthPurchases = purchases.filter(p => new Date(p.purchase_date) >= startOfMonth);
  const monthTotal = monthPurchases.reduce((sum, p) => sum + Number(p.total), 0);

  const filteredPurchases = useMemo(() => {
    let result = [...purchases];
    if (search) {
      result = result.filter(p =>
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.purchase_items?.some(i => i.product_name.toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (filterSupplier) {
      result = result.filter(p => p.supplier_id === filterSupplier);
    }
    if (filterDate) {
      const day = new Date(filterDate);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      result = result.filter(p => {
        const pd = new Date(p.purchase_date);
        return pd >= day && pd < nextDay;
      });
    }
    return result;
  }, [purchases, search, filterSupplier, filterDate]);

  const detailPurchase = showDetail ? purchases.find(p => p.id === showDetail) : null;

  if (loading) return <Loading message="Cargando compras..." />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Compras"
        subtitle="Registra y consulta tus compras de mercancía"
        right={
          <Button onPress={() => setShowForm(true)} size="md">
            <Plus color={colors.white} size={18} strokeWidth={2.5} />
            <Text style={{ color: colors.white }}>Nueva compra</Text>
          </Button>
        }
      />

      <View style={styles.content}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Compras del mes</Text>
            <Text style={styles.summaryValue}>{formatCurrency(monthTotal)}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Número de compras</Text>
            <Text style={styles.summaryValue}>{monthPurchases.length}</Text>
          </Card>
        </View>

        {/* Filters */}
        <Card style={styles.filtersCard}>
          <View style={styles.searchRow}>
            <View style={styles.searchInput}>
              <Search color={colors.textSecondary} size={18} strokeWidth={2} />
              <TextInput
                style={styles.searchTextInput}
                placeholder="Buscar por proveedor o producto..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
          </View>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Select
                value={filterSupplier}
                onValueChange={setFilterSupplier}
                placeholder="Todos los proveedores"
                options={suppliers.map((s: Supplier) => ({ label: s.name, value: s.id }))}
              />
            </View>
            <View style={styles.filterItem}>
              <Input
                value={filterDate}
                onChangeText={setFilterDate}
                placeholder="Filtrar por fecha (YYYY-MM-DD)"
                style={styles.dateInput}
              />
            </View>
          </View>
        </Card>

        {/* Purchases list */}
        {filteredPurchases.length === 0 ? (
          <EmptyState
            icon={<Truck color={colors.neutral[300]} size={48} strokeWidth={2} />}
            title="No hay compras registradas"
            message="Registra tu primera compra de mercancía para empezar a llevar el control de inventario"
            action={<Button onPress={() => setShowForm(true)}>Registrar compra</Button>}
          />
        ) : (
          <View style={styles.purchasesList}>
            {filteredPurchases.map(purchase => {
              const itemCount = purchase.purchase_items?.length || 0;
              return (
                <Card key={purchase.id} style={styles.purchaseCard} onPress={() => setShowDetail(purchase.id)}>
                  <View style={styles.purchaseRow}>
                    <View style={styles.purchaseInfo}>
                      <Text style={styles.purchaseAmount}>{formatCurrency(Number(purchase.total))}</Text>
                      <Text style={styles.purchaseDate}>{formatDateTime(purchase.purchase_date)}</Text>
                      <View style={styles.purchaseTags}>
                        {purchase.supplier ? (
                          <Badge variant="primary" size="sm">{purchase.supplier.name}</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Sin proveedor</Badge>
                        )}
                      </View>
                    </View>
                    <View style={styles.purchaseItems}>
                      <Text style={styles.purchaseItemsCount}>
                        {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
                      </Text>
                      <Eye color={colors.textSecondary} size={18} strokeWidth={2} />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>

      {/* New purchase modal */}
      <PurchaseFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        products={products.filter(p => p.active)}
        suppliers={suppliers}
        storeId={storeId || ''}
        onComplete={() => {
          refresh();
          setShowForm(false);
        }}
      />

      {/* Purchase detail modal */}
      <PurchaseDetailModal
        purchase={detailPurchase}
        products={products}
        visible={!!detailPurchase}
        onClose={() => setShowDetail(null)}
        onDelete={async () => {
          if (!detailPurchase || !storeId) return;
          confirmAction(
            '¿Seguro que deseas eliminar esta compra? El inventario se restará y se eliminará el gasto asociado.',
            async () => {
              try {
                // Reverse stock: subtract purchased quantities
                if (detailPurchase.purchase_items) {
                  for (const item of detailPurchase.purchase_items) {
                    if (item.product_id) {
                      const product = products.find(p => p.id === item.product_id);
                      if (product) {
                        await supabase
                          .from('products')
                          .update({
                            stock: Math.max(0, Number(product.stock) - Number(item.quantity)),
                            updated_at: new Date().toISOString(),
                          })
                          .eq('id', product.id);
                      }
                    }
                  }
                }
                // Delete linked expense
                await supabase.from('expenses').delete().eq('purchase_id', detailPurchase.id);
                // Delete purchase items + purchase (items first due to FK)
                await supabase.from('purchase_items').delete().eq('purchase_id', detailPurchase.id);
                await supabase.from('purchases').delete().eq('id', detailPurchase.id);
                refresh();
                setShowDetail(null);
                showSuccess('Compra eliminada correctamente');
              } catch (e: any) {
                showError('No se pudo eliminar la compra: ' + (e.message || ''));
              }
            }
          );
        }}
      />
    </ScrollView>
  );
}

function PurchaseFormModal({ visible, onClose, products, suppliers, storeId, onComplete }: {
  visible: boolean;
  onClose: () => void;
  products: Product[];
  suppliers: Supplier[];
  storeId: string;
  onComplete: () => void;
}) {
  const [cart, setCart] = useState<PurchaseCartItem[]>([]);
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase())
  );

  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      if (prev.find(i => i.product.id === product.id)) {
        showError('Este producto ya fue agregado');
        return prev;
      }
      return [...prev, { product, quantity: 1, unitPrice: Number(product.purchase_price) }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ));
  };

  const updateUnitPrice = (productId: string, value: string) => {
    const price = parseFloat(value) || 0;
    setCart(prev => prev.map(item =>
      item.product.id === productId ? { ...item, unitPrice: Math.max(0, price) } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const reset = () => {
    setCart([]);
    setSearch('');
    setSupplierId('');
    setNotes('');
  };

  const handleSave = async () => {
    if (cart.length === 0) {
      showError('Agrega al menos un producto a la compra');
      return;
    }
    if (cart.some(i => i.quantity <= 0)) {
      showError('Las cantidades deben ser mayores a cero');
      return;
    }

    setSaving(true);
    try {
      const purchaseDate = new Date().toISOString();

      // 1. Insert purchase
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          store_id: storeId,
          supplier_id: supplierId || null,
          total,
          notes: notes || null,
          purchase_date: purchaseDate,
        })
        .select()
        .single();
      if (purchaseError) throw purchaseError;

      // 2. Insert purchase_items
      const purchaseItems = cart.map(item => ({
        purchase_id: purchaseData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.unitPrice * item.quantity,
      }));
      const { error: itemsError } = await supabase.from('purchase_items').insert(purchaseItems);
      if (itemsError) throw itemsError;

      // 3. Update product stock (add quantity) + update purchase_price
      for (const item of cart) {
        await supabase
          .from('products')
          .update({
            stock: Number(item.product.stock) + item.quantity,
            purchase_price: item.unitPrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.product.id);
      }

      // 4. Create expense record (category mercancia, linked via purchase_id)
      const supplier = suppliers.find(s => s.id === supplierId);
      await supabase.from('expenses').insert({
        store_id: storeId,
        category: 'mercancia',
        description: `Compra de mercancía${supplier ? ' - ' + supplier.name : ''}`,
        amount: total,
        expense_date: purchaseDate,
        purchase_id: purchaseData.id,
        notes: notes || null,
      });

      reset();
      showSuccess('Compra registrada correctamente');
      onComplete();
    } catch (e: any) {
      showError('No se pudo registrar la compra: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.formContainer}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Nueva compra</Text>
          <TouchableOpacity onPress={onClose} style={styles.formClose}>
            <X color={colors.text} size={24} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.formBody}>
          {/* Product search */}
          <View style={styles.formProducts}>
            <View style={styles.searchInput}>
              <Search color={colors.textSecondary} size={18} strokeWidth={2} />
              <TextInput
                style={styles.searchTextInput}
                placeholder="Buscar producto..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
            <ScrollView style={styles.productList} showsVerticalScrollIndicator={false}>
              {filteredProducts.length === 0 ? (
                <Text style={styles.formEmpty}>No se encontraron productos</Text>
              ) : (
                filteredProducts.map(product => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.productItem}
                    onPress={() => addToCart(product)}
                  >
                    <View style={styles.productItemInfo}>
                      <Text style={styles.productItemName}>{product.name}</Text>
                      <Text style={styles.productItemPrice}>
                        {formatCurrency(Number(product.purchase_price))} · Stock: {Number(product.stock)}
                      </Text>
                    </View>
                    <Plus color={colors.primary[600]} size={20} strokeWidth={2.5} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          {/* Cart */}
          <View style={styles.formCart}>
            <Text style={styles.cartTitle}>Productos ({cart.length})</Text>
            <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
              {cart.length === 0 ? (
                <View style={styles.cartEmpty}>
                  <Package color={colors.neutral[300]} size={36} strokeWidth={2} />
                  <Text style={styles.cartEmptyText}>Agrega productos a la compra</Text>
                </View>
              ) : (
                cart.map(item => (
                  <View key={item.product.id} style={styles.cartItem}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.product.name}</Text>
                      <View style={styles.cartItemRow}>
                        <View style={styles.qtyControl}>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, -1)}>
                            <Minus color={colors.text} size={12} strokeWidth={2.5} />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{item.quantity}</Text>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, 1)}>
                            <Plus color={colors.text} size={12} strokeWidth={2.5} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.priceInput}>
                          <Text style={styles.pricePrefix}>$</Text>
                          <TextInput
                            style={styles.priceTextInput}
                            value={String(item.unitPrice)}
                            onChangeText={(v) => updateUnitPrice(item.product.id, v)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.neutral[400]}
                          />
                        </View>
                      </View>
                      <Text style={styles.cartItemSubtotal}>
                        Subtotal: {formatCurrency(item.unitPrice * item.quantity)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeFromCart(item.product.id)} style={styles.removeBtn}>
                      <Trash2 color={colors.error} size={16} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Supplier + notes + total */}
            <View style={styles.paymentSection}>
              <Select
                label="Proveedor (opcional)"
                value={supplierId}
                onValueChange={setSupplierId}
                placeholder="Seleccionar proveedor"
                options={suppliers.map((s: Supplier) => ({ label: s.name, value: s.id }))}
              />
              <Input
                label="Notas (opcional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="Observaciones..."
                multiline
              />

              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total compra</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
              </View>

              <Button
                onPress={handleSave}
                loading={saving}
                disabled={cart.length === 0}
                size="lg"
                fullWidth
              >
                Registrar compra
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PurchaseDetailModal({ purchase, products, visible, onClose, onDelete }: {
  purchase: Purchase | null;
  products: Product[];
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  if (!purchase) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.detailPanel}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>Detalle de compra</Text>
            <TouchableOpacity onPress={onClose} style={styles.formClose}>
              <X color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Fecha</Text>
              <Text style={styles.detailInfoValue}>{formatDateTime(purchase.purchase_date)}</Text>
            </View>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Proveedor</Text>
              <Text style={styles.detailInfoValue}>{purchase.supplier?.name || 'Sin proveedor'}</Text>
            </View>

            <Text style={styles.detailSectionTitle}>Artículos</Text>
            {(purchase.purchase_items || []).map(item => (
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
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(Number(purchase.total))}</Text>
              </View>
            </View>

            {purchase.notes && (
              <View style={styles.detailNotes}>
                <Text style={styles.detailNotesLabel}>Notas</Text>
                <Text style={styles.detailNotesText}>{purchase.notes}</Text>
              </View>
            )}

            <Button onPress={onDelete} variant="danger" size="md" fullWidth>
              <XCircle color={colors.white} size={18} strokeWidth={2} />
              <Text style={{ color: colors.white }}>Eliminar compra</Text>
            </Button>
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
  content: { maxWidth: 900, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1 },
  summaryLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginBottom: 4 },
  summaryValue: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text },
  filtersCard: { marginBottom: spacing.md },
  searchRow: { marginBottom: spacing.sm },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.white },
  searchTextInput: { flex: 1, fontSize: typography.body, color: colors.text, fontFamily: typography.fontFamilyRegular },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterItem: { flex: 1 },
  dateInput: {},
  purchasesList: { gap: spacing.sm },
  purchaseCard: {},
  purchaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  purchaseInfo: { flex: 1 },
  purchaseAmount: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  purchaseDate: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  purchaseTags: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  purchaseItems: { alignItems: 'flex-end', gap: 6 },
  purchaseItemsCount: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  // Form modal
  formContainer: { flex: 1, backgroundColor: colors.background },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  formTitle: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text },
  formClose: { padding: spacing.xs },
  formBody: { flex: 1, flexDirection: isWide ? 'row' : 'column', maxWidth: 1200, width: '100%', alignSelf: 'center' },
  formProducts: { flex: 1, padding: spacing.md, borderRightWidth: isWide ? 1 : 0, borderRightColor: colors.border },
  formCart: { flex: 1, padding: spacing.md, maxWidth: isWide ? 440 : '100%' },
  productList: { marginTop: spacing.sm },
  productItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, marginBottom: spacing.sm, ...shadows.sm },
  productItemInfo: { flex: 1 },
  productItemName: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  productItemPrice: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  formEmpty: { textAlign: 'center', color: colors.textSecondary, padding: spacing.xl, fontSize: typography.bodySmall },
  cartTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: spacing.sm },
  cartList: { flex: 1, maxHeight: isWide ? 320 : 220 },
  cartEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  cartEmptyText: { color: colors.textSecondary, fontSize: typography.bodySmall, fontFamily: typography.fontFamilyRegular },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.sm, backgroundColor: colors.neutral[50], borderRadius: radius.md, marginBottom: spacing.sm },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: 6 },
  cartItemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  qtyText: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text, minWidth: 20, textAlign: 'center' },
  priceInput: { flexDirection: 'row', alignItems: 'center', flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.white, maxWidth: 130 },
  pricePrefix: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  priceTextInput: { flex: 1, fontSize: typography.bodySmall, color: colors.text, fontFamily: typography.fontFamilyRegular, paddingVertical: 4 },
  cartItemSubtotal: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyMedium, marginTop: 2 },
  removeBtn: { padding: 4, marginLeft: 4, marginTop: 2 },
  paymentSection: { paddingTop: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs, paddingTop: spacing.sm },
  grandTotalLabel: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  grandTotalValue: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.primary[700] },
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
