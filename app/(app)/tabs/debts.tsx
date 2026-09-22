import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Dimensions, Platform } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, Button, Input, Select, Badge, EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { ProgressBar } from '@/components/charts';
import { formatCurrency, formatDate, formatDateTime, getPaymentMethodLabel } from '@/lib/format';
import { showSuccess, showError, confirmAction } from '@/lib/alerts';
import type { Debt } from '@/lib/types';
import {
  HandCoins, Plus, X, Search, Eye, Trash2, CheckCircle, User,
  Wallet, Clock, ArrowRight
} from 'lucide-react-native';

export default function DebtsScreen() {
  const { store } = useAuth();
  const { debts, customers, loading, refresh, storeId } = useStoreData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [showNewDebt, setShowNewDebt] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);

  const filteredDebts = useMemo(() => {
    let result = [...debts];
    if (filter === 'pending') result = result.filter(d => d.status === 'pending');
    if (filter === 'paid') result = result.filter(d => d.status === 'paid');
    if (search) {
      result = result.filter(d => d.customer?.name?.toLowerCase().includes(search.toLowerCase()));
    }
    return result;
  }, [debts, filter, search]);

  const pendingDebts = debts.filter(d => d.status === 'pending');
  const totalPending = pendingDebts.reduce((sum, d) => sum + Number(d.balance), 0);
  const paidDebts = debts.filter(d => d.status === 'paid');
  const paymentDebt = showPayment ? debts.find(d => d.id === showPayment) : null;
  const detailDebt = showDetail ? debts.find(d => d.id === showDetail) : null;

  if (loading) return <Loading message="Cargando fiados..." />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Fiados"
        subtitle="Ventas a crédito y deudas de clientes"
        right={
          <Button onPress={() => setShowNewDebt(true)} size="sm">
            <Plus color={colors.white} size={18} strokeWidth={2.5} />
            <Text style={{ color: colors.white }}>Nuevo fiado</Text>
          </Button>
        }
      />

      <View style={styles.content}>
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Wallet color={colors.warning} size={20} strokeWidth={2} />
            </View>
            <Text style={styles.summaryLabel}>Por cobrar</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalPending)}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Clock color={colors.warning} size={20} strokeWidth={2} />
            </View>
            <Text style={styles.summaryLabel}>Pendientes</Text>
            <Text style={styles.summaryValue}>{pendingDebts.length}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <CheckCircle color={colors.success} size={20} strokeWidth={2} />
            </View>
            <Text style={styles.summaryLabel}>Pagados</Text>
            <Text style={styles.summaryValue}>{paidDebts.length}</Text>
          </Card>
        </View>

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

        <View style={styles.tabsRow}>
          <TabBtn label="Todos" active={filter === 'all'} onPress={() => setFilter('all')} count={debts.length} />
          <TabBtn label="Pendientes" active={filter === 'pending'} onPress={() => setFilter('pending')} count={pendingDebts.length} />
          <TabBtn label="Pagados" active={filter === 'paid'} onPress={() => setFilter('paid')} count={paidDebts.length} />
        </View>

        {filteredDebts.length === 0 ? (
          <EmptyState
            icon={<HandCoins color={colors.neutral[300]} size={48} strokeWidth={2} />}
            title="No hay fiados registrados"
            message="Registra ventas a crédito para llevar el control de quién te debe"
            action={<Button onPress={() => setShowNewDebt(true)}>Registrar fiado</Button>}
          />
        ) : (
          <View style={styles.debtsList}>
            {filteredDebts.map(debt => {
              const paid = Number(debt.original_amount) - Number(debt.balance);
              const progress = Number(debt.original_amount) > 0 ? paid / Number(debt.original_amount) : 0;
              return (
                <Card key={debt.id} style={styles.debtCard} onPress={() => setShowDetail(debt.id)}>
                  <View style={styles.debtTop}>
                    <View style={styles.debtCustomer}>
                      <View style={styles.debtAvatar}>
                        <User color={colors.primary[600]} size={16} strokeWidth={2} />
                      </View>
                      <View>
                        <Text style={styles.debtCustomerName}>{debt.customer?.name || 'Cliente'}</Text>
                        <Text style={styles.debtDate}>{formatDate(debt.debt_date)}</Text>
                      </View>
                    </View>
                    <Badge variant={debt.status === 'pending' ? 'warning' : 'success'} size="sm">
                      {debt.status === 'pending' ? 'Pendiente' : 'Pagado'}
                    </Badge>
                  </View>

                  <View style={styles.debtAmounts}>
                    <View style={styles.debtAmountItem}>
                      <Text style={styles.debtAmountLabel}>Original</Text>
                      <Text style={styles.debtAmountValue}>{formatCurrency(Number(debt.original_amount))}</Text>
                    </View>
                    <View style={styles.debtAmountItem}>
                      <Text style={styles.debtAmountLabel}>Abonado</Text>
                      <Text style={[styles.debtAmountValue, { color: colors.success }]}>{formatCurrency(paid)}</Text>
                    </View>
                    <View style={styles.debtAmountItem}>
                      <Text style={styles.debtAmountLabel}>Saldo</Text>
                      <Text style={[styles.debtAmountValue, { color: debt.status === 'pending' ? colors.warning : colors.text }]}>{formatCurrency(Number(debt.balance))}</Text>
                    </View>
                  </View>

                  {debt.status === 'pending' && (
                    <ProgressBar value={paid} max={Number(debt.original_amount)} color={colors.warning} height={6} />
                  )}

                  {debt.status === 'pending' && (
                    <View style={styles.debtActions}>
                      <Button onPress={() => setShowPayment(debt.id)} size="sm" fullWidth>
                        <HandCoins color={colors.white} size={16} strokeWidth={2} />
                        <Text style={{ color: colors.white }}>Registrar abono</Text>
                      </Button>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </View>

      <PaymentModal
        debt={paymentDebt}
        visible={!!paymentDebt}
        onClose={() => setShowPayment(null)}
        storeId={storeId || ''}
        onPaid={() => { refresh(); setShowPayment(null); }}
      />

      <NewDebtModal
        visible={showNewDebt}
        onClose={() => setShowNewDebt(false)}
        customers={customers}
        storeId={storeId || ''}
        onSaved={() => { refresh(); setShowNewDebt(false); }}
      />

      <DebtDetailModal
        debt={detailDebt}
        visible={!!detailDebt}
        onClose={() => setShowDetail(null)}
        onDelete={async () => {
          if (!detailDebt) return;
          confirmAction('¿Eliminar este fiado? Esta acción no se puede deshacer.', async () => {
            if (detailDebt.customer_id) {
              const customer = customers.find(c => c.id === detailDebt.customer_id);
              if (customer) {
                await supabase
                  .from('customers')
                  .update({ outstanding_balance: Math.max(0, Number(customer.outstanding_balance) - Number(debt.balance)) })
                  .eq('id', customer.id);
              }
            }
            await supabase.from('debts').delete().eq('id', detailDebt.id);
            refresh();
            setShowDetail(null);
            showSuccess('Fiado eliminado');
          });
        }}
      />
    </ScrollView>
  );
}

function TabBtn({ label, active, onPress, count }: { label: string; active: boolean; onPress: () => void; count: number }) {
  return (
    <TouchableOpacity
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
      <View style={[styles.tabBtnCount, active && styles.tabBtnCountActive]}>
        <Text style={[styles.tabBtnCountText, active && styles.tabBtnCountTextActive]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

function PaymentModal({ debt, visible, onClose, storeId, onPaid }: {
  debt: Debt | null;
  visible: boolean;
  onClose: () => void;
  storeId: string;
  onPaid: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useMemo(() => {
    setAmount('');
    setPaymentMethod('efectivo');
    setNotes('');
    setError(null);
  }, [debt]);

  if (!debt) return null;

  const balance = Number(debt.balance);

  const handlePay = async () => {
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) { setError('Ingresa un monto válido'); return; }
    if (payAmount > balance) { setError('El abono no puede ser mayor al saldo pendiente'); return; }

    setSaving(true);
    setError(null);
    try {
      const newBalance = balance - payAmount;
      const newStatus = newBalance <= 0 ? 'paid' : 'pending';

      const { error: payError } = await supabase.from('debt_payments').insert({
        debt_id: debt.id,
        amount: payAmount,
        payment_method: paymentMethod,
        notes: notes || null,
      });
      if (payError) throw payError;

      const { error: debtError } = await supabase.from('debts')
        .update({ balance: newBalance, status: newStatus })
        .eq('id', debt.id);
      if (debtError) throw debtError;

      if (debt.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('outstanding_balance')
          .eq('id', debt.customer_id)
          .single();
        if (customer) {
          await supabase
            .from('customers')
            .update({ outstanding_balance: Math.max(0, Number(customer.outstanding_balance) - payAmount) })
            .eq('id', debt.customer_id);
        }
      }

      showSuccess(newStatus === 'paid' ? 'Fiado completamente pagado' : 'Abono registrado');
      onPaid();
    } catch (e: any) {
      setError('No se pudo registrar el abono: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.formPanel}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Registrar abono</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            <View style={styles.payInfo}>
              <Text style={styles.payInfoLabel}>Cliente</Text>
              <Text style={styles.payInfoValue}>{debt.customer?.name}</Text>
            </View>
            <View style={styles.payInfo}>
              <Text style={styles.payInfoLabel}>Saldo pendiente</Text>
              <Text style={[styles.payInfoValue, { color: colors.warning, fontSize: typography.h3 }]}>{formatCurrency(balance)}</Text>
            </View>

            <Input
              label="Monto del abono"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="numeric"
              error={error}
            />

            <View style={styles.quickAmounts}>
              <TouchableOpacity style={styles.quickAmountBtn} onPress={() => setAmount(String(balance))}>
                <Text style={styles.quickAmountText}>Pago completo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAmountBtn} onPress={() => setAmount(String(Math.ceil(balance / 2)))}>
                <Text style={styles.quickAmountText}>Mitad</Text>
              </TouchableOpacity>
            </View>

            <Select
              label="Método de pago"
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              options={[
                { label: 'Efectivo', value: 'efectivo' },
                { label: 'Tarjeta', value: 'tarjeta' },
                { label: 'Transferencia', value: 'transferencia' },
                { label: 'Nequi', value: 'nequi' },
                { label: 'Daviplata', value: 'daviplata' },
              ]}
            />

            <Input
              label="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Observaciones..."
              multiline
            />

            <Button onPress={handlePay} loading={saving} size="lg" fullWidth>
              Registrar abono
            </Button>
            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </View>
        <View style={styles.modalBackdrop} />
      </View>
    </Modal>
  );
}

function NewDebtModal({ visible, onClose, customers, storeId, onSaved }: {
  visible: boolean;
  onClose: () => void;
  customers: any[];
  storeId: string;
  onSaved: () => void;
}) {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useMemo(() => {
    setCustomerId('');
    setAmount('');
    setDescription('');
    setError(null);
  }, [visible]);

  const handleSave = async () => {
    if (!customerId) { setError('Selecciona un cliente'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Ingresa un monto válido'); return; }

    setSaving(true);
    setError(null);
    try {
      const { error: debtError } = await supabase.from('debts').insert({
        store_id: storeId,
        customer_id: customerId,
        original_amount: amt,
        balance: amt,
        status: 'pending',
        description: description || 'Fiado manual',
      });
      if (debtError) throw debtError;

      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        await supabase
          .from('customers')
          .update({ outstanding_balance: Number(customer.outstanding_balance) + amt })
          .eq('id', customerId);
      }

      showSuccess('Fiado registrado');
      onSaved();
    } catch (e: any) {
      setError('No se pudo registrar: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.formPanel}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Nuevo fiado</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            <Select
              label="Cliente"
              value={customerId}
              onValueChange={setCustomerId}
              placeholder="Seleccionar cliente"
              options={customers.map(c => ({ label: c.name, value: c.id }))}
              error={error && !customerId ? 'Selecciona un cliente' : null}
            />
            <Input
              label="Monto del fiado"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="numeric"
              error={error && !amount ? error : null}
            />
            <Input
              label="Descripción (opcional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Compra de mercados"
              multiline
            />
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            <Button onPress={handleSave} loading={saving} size="lg" fullWidth>
              Registrar fiado
            </Button>
            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </View>
        <View style={styles.modalBackdrop} />
      </View>
    </Modal>
  );
}

function DebtDetailModal({ debt, visible, onClose, onDelete }: {
  debt: Debt | null;
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  if (!debt) return null;

  const paid = Number(debt.original_amount) - Number(debt.balance);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.formPanel}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Detalle del fiado</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Cliente</Text>
              <Text style={styles.detailInfoValue}>{debt.customer?.name}</Text>
            </View>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Fecha</Text>
              <Text style={styles.detailInfoValue}>{formatDate(debt.debt_date)}</Text>
            </View>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Estado</Text>
              <Badge variant={debt.status === 'pending' ? 'warning' : 'success'} size="sm">
                {debt.status === 'pending' ? 'Pendiente' : 'Pagado'}
              </Badge>
            </View>
            {debt.description && (
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Descripción</Text>
                <Text style={styles.detailInfoValue}>{debt.description}</Text>
              </View>
            )}

            <View style={styles.detailAmounts}>
              <View style={styles.detailAmountCard}>
                <Text style={styles.detailAmountLabel}>Original</Text>
                <Text style={styles.detailAmountValue}>{formatCurrency(Number(debt.original_amount))}</Text>
              </View>
              <View style={styles.detailAmountCard}>
                <Text style={styles.detailAmountLabel}>Abonado</Text>
                <Text style={[styles.detailAmountValue, { color: colors.success }]}>{formatCurrency(paid)}</Text>
              </View>
              <View style={styles.detailAmountCard}>
                <Text style={styles.detailAmountLabel}>Saldo</Text>
                <Text style={[styles.detailAmountValue, { color: colors.warning }]}>{formatCurrency(Number(debt.balance))}</Text>
              </View>
            </View>

            <Text style={styles.detailSectionTitle}>Historial de pagos</Text>
            {(!debt.debt_payments || debt.debt_payments.length === 0) ? (
              <Text style={styles.detailEmpty}>No hay pagos registrados</Text>
            ) : (
              <View>
                {debt.debt_payments.map(pay => (
                  <View key={pay.id} style={styles.payHistoryItem}>
                    <View style={styles.payHistoryLeft}>
                      <View style={styles.payHistoryIcon}>
                        <CheckCircle color={colors.success} size={16} strokeWidth={2} />
                      </View>
                      <View>
                        <Text style={styles.payHistoryAmount}>{formatCurrency(Number(pay.amount))}</Text>
                        <Text style={styles.payHistoryDate}>{formatDateTime(pay.payment_date)} - {getPaymentMethodLabel(pay.payment_method)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: spacing.lg }} />
            <Button onPress={onDelete} variant="danger" size="md" fullWidth>
              <Trash2 color={colors.white} size={16} strokeWidth={2} />
              <Text style={{ color: colors.white }}>Eliminar fiado</Text>
            </Button>
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
  summaryIcon: { marginBottom: spacing.xs },
  summaryLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  summaryValue: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text, marginTop: 2 },
  searchRow: { marginBottom: spacing.md },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.white },
  searchTextInput: { flex: 1, fontSize: typography.body, color: colors.text, fontFamily: typography.fontFamilyRegular },
  tabsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  tabBtnActive: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
  tabBtnText: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyMedium },
  tabBtnTextActive: { color: colors.primary[700], fontFamily: typography.fontFamilyBold },
  tabBtnCount: { backgroundColor: colors.neutral[100], borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  tabBtnCountActive: { backgroundColor: colors.primary[600] },
  tabBtnCountText: { fontSize: 11, color: colors.textSecondary, fontFamily: typography.fontFamilyBold },
  tabBtnCountTextActive: { color: colors.white },
  debtsList: { gap: spacing.sm },
  debtCard: {},
  debtTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  debtCustomer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  debtAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  debtCustomerName: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  debtDate: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  debtAmounts: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, marginBottom: spacing.sm },
  debtAmountItem: { flex: 1 },
  debtAmountLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  debtAmountValue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text, marginTop: 2 },
  debtActions: { marginTop: spacing.sm },
  // Modals
  modalOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  formPanel: { width: 460, maxWidth: '95%', backgroundColor: colors.card, ...shadows.lg },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  formTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  closeBtn: { padding: spacing.xs },
  formBody: { flex: 1, padding: spacing.lg },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#991B1B', fontSize: typography.bodySmall, fontFamily: typography.fontFamilyRegular },
  // Payment
  payInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.md },
  payInfoLabel: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  payInfoValue: { fontSize: typography.body, fontFamily: typography.fontFamilyBold, color: colors.text },
  quickAmounts: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  quickAmountBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.primary[50], alignItems: 'center' },
  quickAmountText: { fontSize: typography.caption, color: colors.primary[700], fontFamily: typography.fontFamilyMedium },
  // Detail
  detailInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailInfoLabel: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  detailInfoValue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  detailAmounts: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.lg },
  detailAmountCard: { flex: 1, backgroundColor: colors.neutral[50], borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  detailAmountLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  detailAmountValue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text, marginTop: 4 },
  detailSectionTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: spacing.sm },
  detailEmpty: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, textAlign: 'center', padding: spacing.lg },
  payHistoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  payHistoryLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  payHistoryIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  payHistoryAmount: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  payHistoryDate: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
});
