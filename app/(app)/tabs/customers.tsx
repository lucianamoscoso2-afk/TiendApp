import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, Button, Input, Badge, EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { showSuccess, showError, confirmAction } from '@/lib/alerts';
import type { Customer } from '@/lib/types';
import {
  UserCircle, Plus, Search, X, Pencil, Trash2, Phone, Mail, MapPin,
  Eye, ShoppingBag, HandCoins
} from 'lucide-react-native';

export default function CustomersScreen() {
  const { store } = useAuth();
  const { customers, sales, debts, loading, refresh, storeId } = useStoreData();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showDetail, setShowDetail] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    );
  }, [customers, search]);

  const detailCustomer = showDetail ? customers.find(c => c.id === showDetail) : null;
  const detailSales = detailCustomer ? sales.filter(s => s.customer_id === detailCustomer.id) : [];
  const detailDebts = detailCustomer ? debts.filter(d => d.customer_id === detailCustomer.id) : [];

  if (loading) return <Loading message="Cargando clientes..." />;

  const totalOutstanding = customers.reduce((sum, c) => sum + Number(c.outstanding_balance), 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Clientes"
        subtitle={`${customers.length} clientes`}
        right={
          <Button onPress={() => { setEditing(null); setShowForm(true); }} size="sm">
            <Plus color={colors.white} size={18} strokeWidth={2.5} />
            <Text style={{ color: colors.white }}>Agregar</Text>
          </Button>
        }
      />

      <View style={styles.content}>
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Saldo por cobrar</Text>
            <Text style={[styles.summaryValue, { color: totalOutstanding > 0 ? colors.warning : colors.text }]}>{formatCurrency(totalOutstanding)}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Clientes con deuda</Text>
            <Text style={styles.summaryValue}>{customers.filter(c => Number(c.outstanding_balance) > 0).length}</Text>
          </Card>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <Search color={colors.textSecondary} size={18} strokeWidth={2} />
            <TextInput
              style={styles.searchTextInput}
              placeholder="Buscar cliente..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={colors.neutral[400]}
            />
          </View>
        </View>

        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon={<UserCircle color={colors.neutral[300]} size={48} strokeWidth={2} />}
            title="No hay clientes"
            message="Registra tus clientes para llevar el control de sus compras y fiados"
            action={<Button onPress={() => { setEditing(null); setShowForm(true); }}>Agregar cliente</Button>}
          />
        ) : (
          <View style={styles.customerList}>
            {filteredCustomers.map(customer => {
              const customerSales = sales.filter(s => s.customer_id === customer.id);
              const hasDebt = Number(customer.outstanding_balance) > 0;
              return (
                <Card key={customer.id} style={styles.customerCard} onPress={() => setShowDetail(customer.id)}>
                  <View style={styles.customerTop}>
                    <View style={styles.customerAvatar}>
                      <UserCircle color={colors.primary[600]} size={22} strokeWidth={2} />
                    </View>
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>{customer.name}</Text>
                      {customer.phone && <Text style={styles.customerPhone}>{customer.phone}</Text>}
                    </View>
                    {hasDebt && (
                      <Badge variant="warning" size="sm">
                        {formatCurrency(Number(customer.outstanding_balance))}
                      </Badge>
                    )}
                  </View>
                  <View style={styles.customerStats}>
                    <View style={styles.customerStatItem}>
                      <ShoppingBag color={colors.textSecondary} size={14} strokeWidth={2} />
                      <Text style={styles.customerStatText}>{customerSales.length} compras</Text>
                    </View>
                    {hasDebt && (
                      <View style={styles.customerStatItem}>
                        <HandCoins color={colors.warning} size={14} strokeWidth={2} />
                        <Text style={[styles.customerStatText, { color: colors.warning }]}>Debe {formatCurrency(Number(customer.outstanding_balance))}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>

      <CustomerFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        customer={editing}
        storeId={storeId || ''}
        onSaved={() => { refresh(); setShowForm(false); }}
      />

      <CustomerDetailModal
        customer={detailCustomer || null}
        sales={detailSales}
        debts={detailDebts}
        visible={!!detailCustomer}
        onClose={() => setShowDetail(null)}
        onEdit={() => {
          if (detailCustomer) {
            setEditing(detailCustomer);
            setShowDetail(null);
            setShowForm(true);
          }
        }}
        onDelete={() => {
          if (!detailCustomer) return;
          confirmAction(`¿Eliminar el cliente "${detailCustomer.name}"?`, async () => {
            const { error } = await supabase.from('customers').delete().eq('id', detailCustomer.id);
            if (error) {
              showError('No se pudo eliminar. Puede tener ventas o fiados asociados.');
            } else {
              refresh();
              setShowDetail(null);
              showSuccess('Cliente eliminado');
            }
          });
        }}
      />
    </ScrollView>
  );
}

function CustomerFormModal({ visible, onClose, customer, storeId, onSaved }: {
  visible: boolean;
  onClose: () => void;
  customer: Customer | null;
  storeId: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useMemo(() => {
    setName(customer?.name || '');
    setPhone(customer?.phone || '');
    setEmail(customer?.email || '');
    setAddress(customer?.address || '');
    setNotes(customer?.notes || '');
    setError(null);
  }, [customer]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Ingresa el nombre del cliente'); return; }
    setSaving(true);
    setError(null);
    try {
      const data = {
        store_id: storeId,
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };
      if (customer) {
        const { error } = await supabase.from('customers').update(data).eq('id', customer.id);
        if (error) throw error;
        showSuccess('Cliente actualizado');
      } else {
        const { error } = await supabase.from('customers').insert(data);
        if (error) throw error;
        showSuccess('Cliente agregado');
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
            <Text style={styles.formTitle}>{customer ? 'Editar cliente' : 'Nuevo cliente'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            <Input label="Nombre" value={name} onChangeText={setName} placeholder="Nombre del cliente" error={error && !name ? error : null} />
            <Input label="Teléfono" value={phone} onChangeText={setPhone} placeholder="300 123 4567" keyboardType="phone-pad" />
            <Input label="Correo (opcional)" value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" keyboardType="email-address" />
            <Input label="Dirección (opcional)" value={address} onChangeText={setAddress} placeholder="Dirección" />
            <Input label="Notas (opcional)" value={notes} onChangeText={setNotes} placeholder="Observaciones..." multiline />
            {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
            <Button onPress={handleSave} loading={saving} size="lg" fullWidth>
              {customer ? 'Guardar cambios' : 'Agregar cliente'}
            </Button>
            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </View>
        <View style={styles.modalBackdrop} />
      </View>
    </Modal>
  );
}

function CustomerDetailModal({ customer, sales, debts, visible, onClose, onEdit, onDelete }: {
  customer: Customer | null;
  sales: any[];
  debts: any[];
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!customer) return null;
  const totalPurchases = sales.filter(s => s.status === 'completed').reduce((sum, s) => sum + Number(s.total), 0);
  const pendingDebts = debts.filter(d => d.status === 'pending');
  const totalDebt = pendingDebts.reduce((sum, d) => sum + Number(d.balance), 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.formPanel}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Detalle del cliente</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.detailName}>{customer.name}</Text>
            <View style={styles.detailContact}>
              {customer.phone && <View style={styles.detailContactItem}><Phone color={colors.primary[600]} size={16} strokeWidth={2} /><Text style={styles.detailContactText}>{customer.phone}</Text></View>}
              {customer.email && <View style={styles.detailContactItem}><Mail color={colors.primary[600]} size={16} strokeWidth={2} /><Text style={styles.detailContactText}>{customer.email}</Text></View>}
              {customer.address && <View style={styles.detailContactItem}><MapPin color={colors.primary[600]} size={16} strokeWidth={2} /><Text style={styles.detailContactText}>{customer.address}</Text></View>}
            </View>

            <View style={styles.detailStats}>
              <View style={styles.detailStatCard}>
                <Text style={styles.detailStatLabel}>Total comprado</Text>
                <Text style={styles.detailStatValue}>{formatCurrency(totalPurchases)}</Text>
              </View>
              <View style={styles.detailStatCard}>
                <Text style={styles.detailStatLabel}>Compras</Text>
                <Text style={styles.detailStatValue}>{sales.length}</Text>
              </View>
              <View style={styles.detailStatCard}>
                <Text style={styles.detailStatLabel}>Saldo</Text>
                <Text style={[styles.detailStatValue, { color: totalDebt > 0 ? colors.warning : colors.success }]}>{formatCurrency(totalDebt)}</Text>
              </View>
            </View>

            <Text style={styles.detailSectionTitle}>Compras recientes</Text>
            {sales.length === 0 ? (
              <Text style={styles.detailEmpty}>No hay compras registradas</Text>
            ) : (
              sales.slice(0, 10).map(s => (
                <View key={s.id} style={styles.historyItem}>
                  <View>
                    <Text style={styles.historyAmount}>{formatCurrency(Number(s.total))}</Text>
                    <Text style={styles.historyDate}>{formatDate(s.sale_date)}</Text>
                  </View>
                  <Badge variant={s.payment_method === 'fiado' ? 'warning' : 'neutral'} size="sm">{s.payment_method}</Badge>
                </View>
              ))
            )}

            <Text style={styles.detailSectionTitle}>Fiados</Text>
            {debts.length === 0 ? (
              <Text style={styles.detailEmpty}>No tiene fiados</Text>
            ) : (
              debts.slice(0, 10).map(d => (
                <View key={d.id} style={styles.historyItem}>
                  <View>
                    <Text style={styles.historyAmount}>{formatCurrency(Number(d.balance))}</Text>
                    <Text style={styles.historyDate}>{formatDate(d.debt_date)}</Text>
                  </View>
                  <Badge variant={d.status === 'pending' ? 'warning' : 'success'} size="sm">
                    {d.status === 'pending' ? 'Pendiente' : 'Pagado'}
                  </Badge>
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
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1 },
  summaryLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginBottom: 4 },
  summaryValue: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text },
  searchRow: { marginBottom: spacing.md },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.white },
  searchTextInput: { flex: 1, fontSize: typography.body, color: colors.text, fontFamily: typography.fontFamilyRegular },
  customerList: { gap: spacing.sm },
  customerCard: {},
  customerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  customerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: typography.body, fontFamily: typography.fontFamilyBold, color: colors.text },
  customerPhone: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  customerStats: { flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  customerStatItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerStatText: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  modalOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  formPanel: { width: 460, maxWidth: '95%', backgroundColor: colors.card, ...shadows.lg },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  formTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  closeBtn: { padding: spacing.xs },
  formBody: { flex: 1, padding: spacing.lg },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#991B1B', fontSize: typography.bodySmall, fontFamily: typography.fontFamilyRegular },
  detailName: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: spacing.sm },
  detailContact: { gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  detailContactItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailContactText: { fontSize: typography.bodySmall, color: colors.text, fontFamily: typography.fontFamilyRegular },
  detailStats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  detailStatCard: { flex: 1, backgroundColor: colors.neutral[50], borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  detailStatLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  detailStatValue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text, marginTop: 4 },
  detailSectionTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: spacing.sm },
  detailEmpty: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, textAlign: 'center', padding: spacing.lg },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyAmount: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  historyDate: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  detailActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
});
