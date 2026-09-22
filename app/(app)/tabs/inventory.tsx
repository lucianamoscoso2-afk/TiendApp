import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Dimensions, Platform } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, Button, Input, Select, Badge, EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { formatCurrency, formatNumber, formatDate, daysUntil, formatDateInput } from '@/lib/format';
import { showSuccess, showError, confirmAction } from '@/lib/alerts';
import type { Product, Category } from '@/lib/types';
import {
  Package, Plus, Search, Pencil, Trash2, X, Filter, AlertTriangle,
  Clock, XCircle, CheckCircle, Tag
} from 'lucide-react-native';

export default function InventoryScreen() {
  const { store } = useAuth();
  const { products, categories, suppliers, loading, refresh } = useStoreData();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCategories, setShowCategories] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => p.active);
    if (search) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filterCategory) {
      result = result.filter(p => p.category_id === filterCategory);
    }
    if (filterStatus) {
      if (filterStatus === 'low') result = result.filter(p => Number(p.stock) <= Number(p.min_stock) && Number(p.stock) > 0);
      if (filterStatus === 'out') result = result.filter(p => Number(p.stock) <= 0);
      if (filterStatus === 'ok') result = result.filter(p => Number(p.stock) > Number(p.min_stock));
      if (filterStatus === 'expiring') result = result.filter(p => {
        if (!p.expiry_date) return false;
        const days = daysUntil(p.expiry_date);
        return days <= (store?.expiry_alert_days || 7) && days >= 0;
      });
    }
    return result;
  }, [products, search, filterCategory, filterStatus, store]);

  if (loading) return <Loading message="Cargando inventario..." />;

  const totalValue = products.filter(p => p.active).reduce((sum, p) => sum + Number(p.purchase_price) * Number(p.stock), 0);
  const totalSaleValue = products.filter(p => p.active).reduce((sum, p) => sum + Number(p.sale_price) * Number(p.stock), 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Inventario"
        subtitle={`${products.filter(p => p.active).length} productos`}
        right={
          <View style={styles.headerActions}>
            <Button onPress={() => setShowCategories(true)} variant="outline" size="sm">
              <Tag color={colors.primary[700]} size={16} strokeWidth={2} />
              <Text style={{ color: colors.primary[700] }}>Categorías</Text>
            </Button>
            <Button onPress={() => { setEditingProduct(null); setShowForm(true); }} size="sm">
              <Plus color={colors.white} size={18} strokeWidth={2.5} />
              <Text style={{ color: colors.white }}>Agregar</Text>
            </Button>
          </View>
        }
      />

      <View style={styles.content}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Valor en inventario</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
            <Text style={styles.summarySub}>Precio de compra</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Valor de venta</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalSaleValue)}</Text>
            <Text style={styles.summarySub}>Si se vende todo</Text>
          </Card>
        </View>

        {/* Filters */}
        <Card style={styles.filtersCard}>
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
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Select
                value={filterCategory}
                onValueChange={setFilterCategory}
                placeholder="Todas las categorías"
                options={categories.map(c => ({ label: c.name, value: c.id }))}
              />
            </View>
            <View style={styles.filterItem}>
              <Select
                value={filterStatus}
                onValueChange={setFilterStatus}
                placeholder="Todos los estados"
                options={[
                  { label: 'Disponibles', value: 'ok' },
                  { label: 'Pocas existencias', value: 'low' },
                  { label: 'Agotados', value: 'out' },
                  { label: 'Por vencer', value: 'expiring' },
                ]}
              />
            </View>
          </View>
        </Card>

        {/* Products list */}
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Package color={colors.neutral[300]} size={48} strokeWidth={2} />}
            title="No hay productos"
            message="Agrega tu primer producto para empezar a controlar tu inventario"
            action={<Button onPress={() => { setEditingProduct(null); setShowForm(true); }}>Agregar producto</Button>}
          />
        ) : (
          <View style={styles.productList}>
            {filteredProducts.map(product => {
              const stock = Number(product.stock);
              const minStock = Number(product.min_stock);
              const isOut = stock <= 0;
              const isLow = stock <= minStock && stock > 0;
              const expiringDays = product.expiry_date ? daysUntil(product.expiry_date) : null;
              const isExpiring = expiringDays !== null && expiringDays <= (store?.expiry_alert_days || 7) && expiringDays >= 0;
              const profit = Number(product.sale_price) - Number(product.purchase_price);
              const margin = Number(product.purchase_price) > 0 ? (profit / Number(product.purchase_price)) * 100 : 0;

              return (
                <Card key={product.id} style={styles.productCard}>
                  <View style={styles.productTop}>
                    <View style={styles.productHeader}>
                      <Text style={styles.productName}>{product.name}</Text>
                      {product.code && <Text style={styles.productCode}>Código: {product.code}</Text>}
                    </View>
                    {isOut ? (
                      <Badge variant="error" size="sm">Agotado</Badge>
                    ) : isLow ? (
                      <Badge variant="warning" size="sm">Pocas unidades</Badge>
                    ) : isExpiring ? (
                      <Badge variant="warning" size="sm">Por vencer</Badge>
                    ) : (
                      <Badge variant="success" size="sm">Disponible</Badge>
                    )}
                  </View>

                  <View style={styles.productDetails}>
                    <DetailItem label="Stock" value={formatNumber(stock)} highlight={isOut || isLow} />
                    <DetailItem label="Mínimo" value={formatNumber(minStock)} />
                    <DetailItem label="Compra" value={formatCurrency(Number(product.purchase_price))} />
                    <DetailItem label="Venta" value={formatCurrency(Number(product.sale_price))} />
                    <DetailItem label="Ganancia" value={formatCurrency(profit)} positive={profit > 0} />
                    <DetailItem label="Margen" value={`${margin.toFixed(0)}%`} positive={margin > 0} />
                  </View>

                  {product.expiry_date && (
                    <View style={styles.expiryRow}>
                      <Clock color={expiringDays !== null && expiringDays <= 7 ? colors.warning : colors.textSecondary} size={14} strokeWidth={2} />
                      <Text style={[styles.expiryText, expiringDays !== null && expiringDays <= 7 && { color: colors.warning }]}>
                        Vence: {formatDate(product.expiry_date)}
                        {expiringDays !== null && expiringDays >= 0 ? ` (en ${expiringDays} ${expiringDays === 1 ? 'día' : 'días'})` : expiringDays !== null && expiringDays < 0 ? ' (vencido)' : ''}
                      </Text>
                    </View>
                  )}

                  {product.category && (
                    <View style={styles.categoryTag}>
                      <View style={[styles.categoryDot, { backgroundColor: product.category.color }]} />
                      <Text style={styles.categoryText}>{product.category.name}</Text>
                    </View>
                  )}

                  <View style={styles.productActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => { setEditingProduct(product); setShowForm(true); }}
                    >
                      <Pencil color={colors.primary[600]} size={16} strokeWidth={2} />
                      <Text style={styles.editBtnText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => {
                        confirmAction(
                          `¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`,
                          async () => {
                            const { error } = await supabase.from('products').delete().eq('id', product.id);
                            if (error) {
                              showError('No se pudo eliminar el producto');
                            } else {
                              refresh();
                              showSuccess('Producto eliminado');
                            }
                          }
                        );
                      }}
                    >
                      <Trash2 color={colors.error} size={16} strokeWidth={2} />
                      <Text style={styles.deleteBtnText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>

      <ProductFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        product={editingProduct}
        categories={categories}
        suppliers={suppliers}
        storeId={store?.id || ''}
        onSaved={() => { refresh(); setShowForm(false); }}
      />

      <CategoriesModal
        visible={showCategories}
        onClose={() => setShowCategories(false)}
        categories={categories}
        storeId={store?.id || ''}
        onSaved={refresh}
      />
    </ScrollView>
  );
}

function DetailItem({ label, value, highlight, positive }: { label: string; value: string; highlight?: boolean; positive?: boolean }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailItemLabel}>{label}</Text>
      <Text style={[styles.detailItemValue, highlight && { color: colors.error, fontFamily: typography.fontFamilyBold }, positive && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

function ProductFormModal({ visible, onClose, product, categories, suppliers, storeId, onSaved }: {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  suppliers: any[];
  storeId: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name || '');
  const [code, setCode] = useState(product?.code || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || '');
  const [purchasePrice, setPurchasePrice] = useState(String(product?.purchase_price || ''));
  const [salePrice, setSalePrice] = useState(String(product?.sale_price || ''));
  const [stock, setStock] = useState(String(product?.stock || '0'));
  const [minStock, setMinStock] = useState(String(product?.min_stock || '5'));
  const [unit, setUnit] = useState(product?.unit || 'unidad');
  const [supplierId, setSupplierId] = useState(product?.supplier_id || '');
  const [expiryDate, setExpiryDate] = useState(product?.expiry_date ? formatDateInput(product.expiry_date) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when product changes
  useMemo(() => {
    setName(product?.name || '');
    setCode(product?.code || '');
    setCategoryId(product?.category_id || '');
    setPurchasePrice(String(product?.purchase_price || ''));
    setSalePrice(String(product?.sale_price || ''));
    setStock(String(product?.stock || '0'));
    setMinStock(String(product?.min_stock || '5'));
    setUnit(product?.unit || 'unidad');
    setSupplierId(product?.supplier_id || '');
    setExpiryDate(product?.expiry_date ? formatDateInput(product.expiry_date) : '');
    setError(null);
  }, [product]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Ingresa el nombre del producto'); return; }
    if (!purchasePrice || parseFloat(purchasePrice) < 0) { setError('Ingresa un precio de compra válido'); return; }
    if (!salePrice || parseFloat(salePrice) < 0) { setError('Ingresa un precio de venta válido'); return; }

    setSaving(true);
    setError(null);

    const data = {
      store_id: storeId,
      name: name.trim(),
      code: code.trim() || null,
      category_id: categoryId || null,
      purchase_price: parseFloat(purchasePrice) || 0,
      sale_price: parseFloat(salePrice) || 0,
      stock: parseFloat(stock) || 0,
      min_stock: parseFloat(minStock) || 0,
      unit,
      supplier_id: supplierId || null,
      expiry_date: expiryDate || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (product) {
        const { error } = await supabase.from('products').update(data).eq('id', product.id);
        if (error) throw error;
        showSuccess('Producto actualizado');
      } else {
        const { error } = await supabase.from('products').insert(data);
        if (error) throw error;
        showSuccess('Producto agregado');
      }
      onSaved();
    } catch (e: any) {
      setError('No se pudo guardar: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.formPanel}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{product ? 'Editar producto' : 'Nuevo producto'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.posClose}>
              <X color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            <Input label="Nombre del producto" value={name} onChangeText={setName} placeholder="Ej: Arroz 1kg" />
            <Input label="Código (opcional)" value={code} onChangeText={setCode} placeholder="Ej: ARR-001" />
            <Select
              label="Categoría"
              value={categoryId}
              onValueChange={setCategoryId}
              placeholder="Sin categoría"
              options={categories.map(c => ({ label: c.name, value: c.id }))}
            />
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Input label="Precio de compra" value={purchasePrice} onChangeText={setPurchasePrice} placeholder="0" keyboardType="numeric" />
              </View>
              <View style={styles.formCol}>
                <Input label="Precio de venta" value={salePrice} onChangeText={setSalePrice} placeholder="0" keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Input label="Cantidad actual" value={stock} onChangeText={setStock} placeholder="0" keyboardType="numeric" />
              </View>
              <View style={styles.formCol}>
                <Input label="Cantidad mínima" value={minStock} onChangeText={setMinStock} placeholder="5" keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Input label="Unidad" value={unit} onChangeText={setUnit} placeholder="unidad" />
              </View>
              <View style={styles.formCol}>
                <Input label="Fecha de vencimiento" value={expiryDate} onChangeText={setExpiryDate} placeholder="YYYY-MM-DD" />
              </View>
            </View>
            <Select
              label="Proveedor (opcional)"
              value={supplierId}
              onValueChange={setSupplierId}
              placeholder="Sin proveedor"
              options={suppliers.map(s => ({ label: s.name, value: s.id }))}
            />

            {parseFloat(salePrice) > 0 && parseFloat(purchasePrice) > 0 && (
              <View style={styles.profitPreview}>
                <Text style={styles.profitPreviewLabel}>Ganancia por unidad</Text>
                <Text style={styles.profitPreviewValue}>
                  {formatCurrency(parseFloat(salePrice) - parseFloat(purchasePrice))}
                  {' '}({(((parseFloat(salePrice) - parseFloat(purchasePrice)) / parseFloat(purchasePrice)) * 100).toFixed(0)}%)
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button onPress={handleSave} loading={saving} size="lg" fullWidth>
              {product ? 'Guardar cambios' : 'Agregar producto'}
            </Button>
            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </View>
        <View style={styles.modalBackdrop} />
      </View>
    </Modal>
  );
}

function CategoriesModal({ visible, onClose, categories, storeId, onSaved }: {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  storeId: string;
  onSaved: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10B981');
  const [saving, setSaving] = useState(false);

  const colors_list = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  const handleSave = async () => {
    if (!name.trim()) { showError('Ingresa el nombre de la categoría'); return; }
    setSaving(true);
    try {
      if (editing) {
        await supabase.from('categories').update({ name: name.trim(), color }).eq('id', editing.id);
        showSuccess('Categoría actualizada');
      } else {
        await supabase.from('categories').insert({ store_id: storeId, name: name.trim(), color });
        showSuccess('Categoría creada');
      }
      onSaved();
      setShowForm(false);
      setEditing(null);
      setName('');
    } catch {
      showError('No se pudo guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    confirmAction(
      `¿Eliminar la categoría "${cat.name}"?`,
      async () => {
        const { error } = await supabase.from('categories').delete().eq('id', cat.id);
        if (error) {
          showError('No se pudo eliminar. Puede tener productos asociados.');
        } else {
          onSaved();
          showSuccess('Categoría eliminada');
        }
      }
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.formPanel}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Categorías</Text>
            <View style={styles.formHeaderRight}>
              <Button onPress={() => { setEditing(null); setName(''); setShowForm(true); }} size="sm">
                <Plus color={colors.white} size={16} strokeWidth={2.5} />
                <Text style={{ color: colors.white }}>Nueva</Text>
              </Button>
              <TouchableOpacity onPress={onClose} style={styles.posClose}>
                <X color={colors.text} size={24} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            {categories.length === 0 ? (
              <EmptyState
                icon={<Tag color={colors.neutral[300]} size={36} strokeWidth={2} />}
                title="No hay categorías"
                message="Crea categorías para organizar tus productos"
              />
            ) : (
              <View style={styles.categoryList}>
                {categories.map(cat => (
                  <View key={cat.id} style={styles.categoryRow}>
                    <View style={styles.categoryRowLeft}>
                      <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                      <Text style={styles.categoryRowName}>{cat.name}</Text>
                    </View>
                    <View style={styles.categoryRowActions}>
                      <TouchableOpacity
                        onPress={() => { setEditing(cat); setName(cat.name); setColor(cat.color); setShowForm(true); }}
                        style={styles.catEditBtn}
                      >
                        <Pencil color={colors.primary[600]} size={16} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(cat)} style={styles.catDeleteBtn}>
                        <Trash2 color={colors.error} size={16} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {showForm && (
            <View style={styles.catFormOverlay}>
              <Card style={styles.catFormCard}>
                <Text style={styles.catFormTitle}>{editing ? 'Editar categoría' : 'Nueva categoría'}</Text>
                <Input label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Abarrotes" />
                <Text style={styles.inputLabel}>Color</Text>
                <View style={styles.colorPicker}>
                  {colors_list.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorSelected]}
                      onPress={() => setColor(c)}
                    />
                  ))}
                </View>
                <View style={styles.catFormActions}>
                  <Button onPress={() => { setShowForm(false); setEditing(null); }} variant="ghost" size="md">Cancelar</Button>
                  <Button onPress={handleSave} loading={saving} size="md">Guardar</Button>
                </View>
              </Card>
            </View>
          )}
        </View>
        <View style={styles.modalBackdrop} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { maxWidth: 900, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1 },
  summaryLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginBottom: 4 },
  summaryValue: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text },
  summarySub: { fontSize: typography.caption, color: colors.neutral[400], fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  filtersCard: { marginBottom: spacing.md },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.white, marginBottom: spacing.sm },
  searchTextInput: { flex: 1, fontSize: typography.body, color: colors.text, fontFamily: typography.fontFamilyRegular },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterItem: { flex: 1 },
  productList: { gap: spacing.sm },
  productCard: {},
  productTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  productHeader: { flex: 1 },
  productName: { fontSize: typography.body, fontFamily: typography.fontFamilyBold, color: colors.text },
  productCode: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  productDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.sm },
  detailItem: { minWidth: '30%' },
  detailItemLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  detailItemValue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text, marginTop: 2 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  expiryText: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  categoryTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryText: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyMedium },
  productActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.primary[50] },
  editBtnText: { fontSize: typography.caption, color: colors.primary[700], fontFamily: typography.fontFamilyMedium },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: '#FEE2E2' },
  deleteBtnText: { fontSize: typography.caption, color: colors.error, fontFamily: typography.fontFamilyMedium },
  // Modal
  modalOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  formPanel: { width: 480, maxWidth: '95%', backgroundColor: colors.card, ...shadows.lg },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  formHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  formTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  formBody: { flex: 1, padding: spacing.lg },
  posClose: { padding: spacing.xs },
  formRow: { flexDirection: 'row', gap: spacing.md },
  formCol: { flex: 1 },
  profitPreview: { backgroundColor: colors.primary[50], borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  profitPreviewLabel: { fontSize: typography.caption, color: colors.primary[700], fontFamily: typography.fontFamilyMedium },
  profitPreviewValue: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.primary[700], marginTop: 4 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#991B1B', fontSize: typography.bodySmall, fontFamily: typography.fontFamilyRegular },
  inputLabel: { fontSize: typography.bodySmall, color: colors.text, marginBottom: spacing.xs, fontFamily: typography.fontFamilyMedium },
  // Categories
  categoryList: { gap: spacing.sm },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.neutral[50], borderRadius: radius.md },
  categoryRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  categoryRowName: { fontSize: typography.body, fontFamily: typography.fontFamilyMedium, color: colors.text },
  categoryRowActions: { flexDirection: 'row', gap: spacing.sm },
  catEditBtn: { padding: 8, borderRadius: 6, backgroundColor: colors.primary[50] },
  catDeleteBtn: { padding: 8, borderRadius: 6, backgroundColor: '#FEE2E2' },
  catFormOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.3)', padding: spacing.lg },
  catFormCard: { padding: spacing.lg },
  catFormTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: spacing.md },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  colorOption: { width: 32, height: 32, borderRadius: 16 },
  colorSelected: { borderWidth: 3, borderColor: colors.text },
  catFormActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
