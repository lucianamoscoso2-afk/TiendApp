import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, Button, Input, EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { showSuccess, showError, confirmAction } from '@/lib/alerts';
import type { Supplier } from '@/lib/types';
import {
  Users, Plus, Search, X, Pencil, Trash2, Phone, Mail, MapPin,
  Package, Eye, Truck
} from 'lucide-react-native';

export default function SuppliersScreen() {
  const { store } = useAuth();
  const { suppliers, purchases, products, loading, refresh, storeId } = useStoreData();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [showDetail, setShowDetail] = useState<string | null>(null);

  const filteredSuppliers = useMemo(() => {
    if (!search) return suppliers;
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.company?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
    );
  }, [suppliers, search]);

  const detailSupplier = showDetail ? suppliers.find(s => s.id === showDetail) : null;
  const detailPurchases = detailSupplier ? purchases.filter(p => p.supplier_id === detailSupplier.id) : [];
  const detailProducts = detailSupplier ? products.filter(p => p.supplier_id === detailSupplier.id) : [];

  if (loading) return <Loading message="Cargando proveedores..." />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Proveedores"
        subtitle={`${suppliers.length} proveedores registrados`}
        right={
          <Button onPress={() => { setEditing(null); setShowForm(true); }} size="sm">
            <Plus color={colors.white} size={18} strokeWidth={2.5} />
            <Text style={{ color: colors.white }}>Agregar</Text>
          </Button>
        }
      />

      <View style={styles.content}>
        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <Search color={colors.textSecondary} size={18} strokeWidth={2} />
            <TextInput
              style={styles.searchTextInput}
              placeholder="Buscar proveedor..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={colors.neutral[400]}
            />
          </View>
        </View>

        {filteredSuppliers.length === 0 ? (
          <EmptyState
            icon={<Users color={colors.neutral[300]} size={48} strokeWidth={2} />}
            title="No hay proveedores"
            message="Registra tus proveedores para llevar el control de tus compras"
            action={<Button onPress={() => { setEditing(null); setShowForm(true); }}>Agregar proveedor</Button>}
          />
        ) : (
          <View style={styles.supplierList}>
            {filteredSuppliers.map(supplier => {
              const supplierPurchases = purchases.filter(p => p.supplier_id === supplier.id);
              const totalSpent = supplierPurchases.reduce((sum, p) => sum + Number(p.total), 0);
              return (
                <Card key={supplier.id} style={styles.supplierCard} onPress={() => setShowDetail(supplier.id)}>
                  <View style={styles.supplierTop}>
                    <View style={styles.supplierAvatar}>
                      <Truck color={colors.primary[600]} size={20} strokeWidth={2} />
                    </View>
                    <View style={styles.supplierInfo}>
                      <Text style={styles.supplierName}>{supplier.name}</Text>
                      {supplier.company && <Text style={styles.supplierCompany}>{supplier.company}</Text>}
                    </View>
                  </View>
                  <View style={styles.supplierDetails}>
                    {supplier.phone && (
                      <View style={styles.supplierDetailItem}>
                        <Phone color={colors.textSecondary} size={14} strokeWidth={2} />
                        <Text style={styles.supplierDetailText}>{supplier.phone}</Text>
                      </View>
                    )}
                    <View style={styles.supplierDetailItem}>
                      <Package color={colors.textSecondary} size={14} strokeWidth={2} />
                      <Text style={styles.supplierDetailText}>{supplierPurchases.length} compras</Text>
                    </View>
                  </View>
                  <View style={styles.supplierFooter}>
                    <Text style={styles.supplierTotalLabel}>Total comprado</Text>
                    <Text style={styles.supplierTotalValue}>{formatCurrency(totalSpent)}</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>

      <SupplierFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        supplier={editing}
        storeId={storeId || ''}
        onSaved={() => { refresh(); setShowForm(false); }}
      />

      <SupplierDetailModal
        supplier={detailSupplier}
        purchases={detailPurchases}
        products={detailProducts}
        visible={!!detailSupplier}
        onClose={() => setShowDetail(null)}
        onEdit={() => {
          if (detailSupplier) {
            setEditing(detailSupplier);
            setShowDetail(null);
            setShowForm(true);
          }
        }}
        onDelete={() => {
          if (!detailSupplier) return;
          confirmAction(`¿Eliminar el proveedor "${detailSupplier.name}"?`, async () => {
            const { error } = await supabase.from('suppliers').delete().eq('id', detailSupplier.id);
            if (error) {
              showError('No se pudo eliminar. Puede tener compras asociadas.');
            } else {
              refresh();
              setShowDetail(null);
              showSuccess('Proveedor eliminado');
            }
          });
        }}
      />
    </ScrollView>
  );
}

function SupplierFormModal({ visible, onClose, supplier, storeId, onSaved }: {
  visible: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  storeId: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [productsSupplied, setProductsSupplied] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useMemo(() => {
    setName(supplier?.name || '');
    setCompany(supplier?.company || '');
    setPhone(supplier?.phone || '');
    setEmail(supplier?.email || '');
    setAddress(supplier?.address || '');
    setProductsSupplied(supplier?.products_supplied || '');
    setNotes(supplier?.notes || '');
    setError(null);
  }, [supplier]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Ingresa el nombre del proveedor'); return; }
    setSaving(true);
    setError(null);
    try {
      const data = {
        store_id: storeId,
        name: name.trim(),
        company: company.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        products_supplied: productsSupplied.trim() || null,
        notes: notes.trim() || null,
      };
      if (supplier) {
        const { error } = await supabase.from('suppliers').update(data).eq('id', supplier.id);
        if (error) throw error;
        showSuccess('Proveedor actualizado');
      } else {
        const { error } = await supabase.from('suppliers').insert(data);
        if (error) throw error;
        showSuccess('Proveedor agregado');
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
            <Text style={styles.formTitle}>{supplier ? 'Editar proveedor' : 'Nuevo proveedor'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            <Input label="Nombre" value={name} onChangeText={setName} placeholder="Nombre del proveedor" error={error && !name ? error : null} />
            <Input label="Empresa (opcional)" value={company} onChangeText={setCompany} placeholder="Nombre de la empresa" />
            <Input label="Teléfono" value={phone} onChangeText={setPhone} placeholder="300 123 4567" keyboardType="phone-pad" />
            <Input label="Correo (opcional)" value={email} onChangeText={setEmail} placeholder="proveedor@correo.com" keyboardType="email-address" />
            <Input label="Dirección (opcional)" value={address} onChangeText={setAddress} placeholder="Dirección" />
            <Input label="Productos que suministra" value={productsSupplied} onChangeText={setProductsSupplied} placeholder="Ej: Abarrotes, lácteos..." multiline />
            <Input label="Notas (opcional)" value={notes} onChangeText={setNotes} placeholder="Observaciones..." multiline />
            {error && (
              <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
            )}
            <Button onPress={handleSave} loading={saving} size="lg" fullWidth>
              {supplier ? 'Guardar cambios' : 'Agregar proveedor'}
            </Button>
            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </View>
        <View style={styles.modalBackdrop} />
      </View>
    </Modal>
  );
}

function SupplierDetailModal({ supplier, purchases, products, visible, onClose, onEdit, onDelete }: {
  supplier: Supplier | null;
  purchases: any[];
  products: any[];
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!supplier) return null;
  const totalSpent = purchases.reduce((sum, p) => sum + Number(p.total), 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.formPanel}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Detalle del proveedor</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.detailName}>{supplier.name}</Text>
            {supplier.company && <Text style={styles.detailCompany}>{supplier.company}</Text>}

            <View style={styles.detailContact}>
              {supplier.phone && (
                <View style={styles.detailContactItem}><Phone color={colors.primary[600]} size={16} strokeWidth={2} /><Text style={styles.detailContactText}>{supplier.phone}</Text></View>
              )}
              {supplier.email && (
                <View style={styles.detailContactItem}><Mail color={colors.primary[600]} size={16} strokeWidth={2} /><Text style={styles.detailContactText}>{supplier.email}</Text></View>
              )}
              {supplier.address && (
                <View style={styles.detailContactItem}><MapPin color={colors.primary[600]} size={16} strokeWidth={2} /><Text style={styles.detailContactText}>{supplier.address}</Text></View>
              )}
            </View>

            {supplier.products_supplied && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Productos que suministra</Text>
                <Text style={styles.detailSectionText}>{supplier.products_supplied}</Text>
              </View>
            )}

            <View style={styles.detailStats}>
              <View style={styles.detailStatCard}>
                <Text style={styles.detailStatLabel}>Total comprado</Text>
                <Text style={styles.detailStatValue}>{formatCurrency(totalSpent)}</Text>
              </View>
              <View style={styles.detailStatCard}>
                <Text style={styles.detailStatLabel}>Compras</Text>
                <Text style={styles.detailStatValue}>{purchases.length}</Text>
              </View>
              <View style={styles.detailStatCard}>
                <Text style={styles.detailStatLabel}>Productos</Text>
                <Text style={styles.detailStatValue}>{products.length}</Text>
              </View>
            </View>

            <Text style={styles.detailSectionTitle}>Historial de compras</Text>
            {purchases.length === 0 ? (
              <Text style={styles.detailEmpty}>No hay compras registradas</Text>
            ) : (
              purchases.slice(0, 10).map(p => (
                <View key={p.id} style={styles.purchaseHistoryItem}>
                  <View>
                    <Text style={styles.purchaseHistoryAmount}>{formatCurrency(Number(p.total))}</Text>
                    <Text style={styles.purchaseHistoryDate}>{formatDate(p.purchase_date)}</Text>
                  </View>
                  <Text style={styles.purchaseHistoryItems}>{p.purchase_items?.length || 0} artículos</Text>
                </View>
              ))
            )}

            <View style={styles.detailActions}>
              <Button onPress={onEdit} variant="outline" size="md" style={{ flex: 1 }}>
                <Pencil color={colors.primary[700]} size={16} strokeWidth={2} />
                <Text style={{ color: colors.primary[700] }}>Editar</Text>
              </Button>
              <Button onPress={onDelete} variant="danger" size="md" style={{ flex: 1 }}>
                <Trash2 color={colors.white} size={16} strokeWidth={2} />
                <Text style={{ color: colors.white }}>Eliminar</Text>
              </Button>
            </View>
            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </View>
        <View style={styles.modalBackdrop} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { maxWidth: 900, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  searchRow: { marginBottom: spacing.md },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.white },
  searchTextInput: { flex: 1, fontSize: typography.body, color: colors.text, fontFamily: typography.fontFamilyRegular },
  supplierList: { gap: spacing.sm },
  supplierCard: {},
  supplierTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  supplierAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  supplierInfo: { flex: 1 },
  supplierName: { fontSize: typography.body, fontFamily: typography.fontFamilyBold, color: colors.text },
  supplierCompany: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  supplierDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.sm },
  supplierDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  supplierDetailText: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  supplierFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  supplierTotalLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  supplierTotalValue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.primary[700] },
  modalOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  formPanel: { width: 460, maxWidth: '95%', backgroundColor: colors.card, ...shadows.lg },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  formTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  closeBtn: { padding: spacing.xs },
  formBody: { flex: 1, padding: spacing.lg },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#991B1B', fontSize: typography.bodySmall, fontFamily: typography.fontFamilyRegular },
  detailName: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: 4 },
  detailCompany: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginBottom: spacing.md },
  detailContact: { gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  detailContactItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailContactText: { fontSize: typography.bodySmall, color: colors.text, fontFamily: typography.fontFamilyRegular },
  detailSection: { marginBottom: spacing.lg },
  detailSectionTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: spacing.sm },
  detailSectionText: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, lineHeight: 20 },
  detailStats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  detailStatCard: { flex: 1, backgroundColor: colors.neutral[50], borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  detailStatLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  detailStatValue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text, marginTop: 4 },
  detailEmpty: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, textAlign: 'center', padding: spacing.lg },
  purchaseHistoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  purchaseHistoryAmount: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  purchaseHistoryDate: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  purchaseHistoryItems: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  detailActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
});
