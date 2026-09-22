import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, Button, Input, Select, Badge, Loading, ScreenHeader } from '@/components/ui';
import { showSuccess, showError, confirmAction } from '@/lib/alerts';
import type { Category } from '@/lib/types';
import {
  Settings, Store, Bell, Tag, CreditCard, Users, X, Pencil,
  Plus, Trash2, Phone, Mail, MapPin, LogOut, Shield, Package
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { store, user, signOut, refreshStore } = useAuth();
  const { categories, loading, refresh, storeId } = useStoreData();
  const [showStoreEdit, setShowStoreEdit] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeSection, setActiveSection] = useState<string>('store');

  if (loading) return <Loading message="Cargando configuración..." />;

  const sections = [
    { id: 'store', label: 'Información de la tienda', icon: <Store color={colors.primary[600]} size={20} strokeWidth={2} /> },
    { id: 'categories', label: 'Categorías', icon: <Tag color={colors.primary[600]} size={20} strokeWidth={2} /> },
    { id: 'payment', label: 'Métodos de pago', icon: <CreditCard color={colors.primary[600]} size={20} strokeWidth={2} /> },
    { id: 'notifications', label: 'Notificaciones', icon: <Bell color={colors.primary[600]} size={20} strokeWidth={2} /> },
    { id: 'account', label: 'Mi cuenta', icon: <Shield color={colors.primary[600]} size={20} strokeWidth={2} /> },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Configuración" subtitle="Personaliza tu tienda" />

      <View style={styles.content}>
        <View style={styles.sectionsList}>
          {sections.map(section => (
            <TouchableOpacity
              key={section.id}
              style={[styles.sectionBtn, activeSection === section.id && styles.sectionBtnActive]}
              onPress={() => setActiveSection(section.id)}
            >
              <View style={styles.sectionIcon}>{section.icon}</View>
              <Text style={[styles.sectionText, activeSection === section.id && styles.sectionTextActive]}>{section.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeSection === 'store' && store && (
          <StoreSettings store={store} onEdit={() => setShowStoreEdit(true)} />
        )}

        {activeSection === 'categories' && (
          <CategoriesSettings
            categories={categories}
            storeId={storeId || ''}
            editingCategory={editingCategory}
            showForm={showCategoryForm}
            onOpenForm={(cat) => { setEditingCategory(cat); setShowCategoryForm(true); }}
            onCloseForm={() => { setShowCategoryForm(false); setEditingCategory(null); }}
            onSaved={() => { refresh(); setShowCategoryForm(false); setEditingCategory(null); }}
          />
        )}

        {activeSection === 'payment' && <PaymentSettings />}

        {activeSection === 'notifications' && store && (
          <NotificationSettings store={store} onUpdate={refreshStore} />
        )}

        {activeSection === 'account' && (
          <AccountSettings user={user} onSignOut={signOut} />
        )}
      </View>
    </ScrollView>
  );
}

function StoreSettings({ store, onEdit }: { store: any; onEdit: () => void }) {
  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Información de la tienda</Text>
        <Button onPress={onEdit} variant="outline" size="sm">
          <Pencil color={colors.primary[700]} size={14} strokeWidth={2} />
          <Text style={{ color: colors.primary[700] }}>Editar</Text>
        </Button>
      </View>

      <InfoRow label="Nombre" value={store.name} />
      {store.description && <InfoRow label="Descripción" value={store.description} />}
      {store.phone && <InfoRow label="Teléfono" value={store.phone} icon={<Phone color={colors.textSecondary} size={16} strokeWidth={2} />} />}
      {store.email && <InfoRow label="Correo" value={store.email} icon={<Mail color={colors.textSecondary} size={16} strokeWidth={2} />} />}
      {store.address && <InfoRow label="Dirección" value={store.address} icon={<MapPin color={colors.textSecondary} size={16} strokeWidth={2} />} />}
      {store.city && <InfoRow label="Ciudad" value={store.city} />}
      <InfoRow label="Moneda" value={store.currency} />
      <InfoRow label="Umbral de stock mínimo" value={String(store.low_stock_threshold)} />
      <InfoRow label="Días de alerta de vencimiento" value={String(store.expiry_alert_days)} />
    </Card>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        {icon && <View style={styles.infoRowIcon}>{icon}</View>}
        <Text style={styles.infoRowLabel}>{label}</Text>
      </View>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  );
}

function CategoriesSettings({ categories, storeId, editingCategory, showForm, onOpenForm, onCloseForm, onSaved }: any) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10B981');
  const [saving, setSaving] = useState(false);

  useMemo(() => {
    setName(editingCategory?.name || '');
    setColor(editingCategory?.color || '#10B981');
  }, [editingCategory]);

  const colors_list = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  const handleSave = async () => {
    if (!name.trim()) { showError('Ingresa el nombre'); return; }
    setSaving(true);
    try {
      if (editingCategory) {
        await supabase.from('categories').update({ name: name.trim(), color }).eq('id', editingCategory.id);
        showSuccess('Categoría actualizada');
      } else {
        await supabase.from('categories').insert({ store_id: storeId, name: name.trim(), color });
        showSuccess('Categoría creada');
      }
      onSaved();
    } catch {
      showError('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    confirmAction(`¿Eliminar la categoría "${cat.name}"?`, async () => {
      const { error } = await supabase.from('categories').delete().eq('id', cat.id);
      if (error) {
        showError('No se pudo eliminar. Puede tener productos asociados.');
      } else {
        onSaved();
        showSuccess('Categoría eliminada');
      }
    });
  };

  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categorías</Text>
        <Button onPress={() => onOpenForm(null)} size="sm">
          <Plus color={colors.white} size={14} strokeWidth={2.5} />
          <Text style={{ color: colors.white }}>Nueva</Text>
        </Button>
      </View>

      {categories.length === 0 ? (
        <Text style={styles.emptyText}>No hay categorías. Crea una para organizar tus productos.</Text>
      ) : (
        <View style={styles.catList}>
          {categories.map(cat => (
            <View key={cat.id} style={styles.catRow}>
              <View style={styles.catRowLeft}>
                <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                <Text style={styles.catRowName}>{cat.name}</Text>
              </View>
              <View style={styles.catRowActions}>
                <TouchableOpacity onPress={() => onOpenForm(cat)} style={styles.catEditBtn}>
                  <Pencil color={colors.primary[600]} size={14} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(cat)} style={styles.catDeleteBtn}>
                  <Trash2 color={colors.error} size={14} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {showForm && (
        <Modal visible={showForm} animationType="fade" transparent onRequestClose={onCloseForm}>
          <View style={styles.catModalOverlay}>
            <Card style={styles.catModalCard}>
              <View style={styles.catModalHeader}>
                <Text style={styles.catModalTitle}>{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</Text>
                <TouchableOpacity onPress={onCloseForm}><X color={colors.text} size={20} strokeWidth={2} /></TouchableOpacity>
              </View>
              <Input label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Abarrotes" />
              <Text style={styles.inputLabel}>Color</Text>
              <View style={styles.colorPicker}>
                {colors_list.map(c => (
                  <TouchableOpacity key={c} style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorSelected]} onPress={() => setColor(c)} />
                ))}
              </View>
              <Button onPress={handleSave} loading={saving} size="md" fullWidth>Guardar</Button>
            </Card>
          </View>
        </Modal>
      )}
    </Card>
  );
}

function PaymentSettings() {
  const methods = [
    { id: 'efectivo', label: 'Efectivo', desc: 'Pago en efectivo' },
    { id: 'tarjeta', label: 'Tarjeta', desc: 'Pago con tarjeta débito o crédito' },
    { id: 'transferencia', label: 'Transferencia', desc: 'Transferencia bancaria' },
    { id: 'nequi', label: 'Nequi', desc: 'Pago por Nequi' },
    { id: 'daviplata', label: 'Daviplata', desc: 'Pago por Daviplata' },
    { id: 'fiado', label: 'Fiado', desc: 'Venta a crédito' },
  ];

  return (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Métodos de pago disponibles</Text>
      <Text style={styles.sectionDesc}>Estos son los métodos de pago que puedes usar al registrar ventas.</Text>
      {methods.map(m => (
        <View key={m.id} style={styles.paymentRow}>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentLabel}>{m.label}</Text>
            <Text style={styles.paymentDesc}>{m.desc}</Text>
          </View>
          <Badge variant="success" size="sm">Activo</Badge>
        </View>
      ))}
    </Card>
  );
}

function NotificationSettings({ store, onUpdate }: { store: any; onUpdate: () => void }) {
  const [notifyLowStock, setNotifyLowStock] = useState(store.notify_low_stock);
  const [notifyExpiry, setNotifyExpiry] = useState(store.notify_expiry);
  const [notifyDebts, setNotifyDebts] = useState(store.notify_debts);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('stores').update({
        notify_low_stock: notifyLowStock,
        notify_expiry: notifyExpiry,
        notify_debts: notifyDebts,
      }).eq('id', store.id);
      onUpdate();
      showSuccess('Preferencias guardadas');
    } catch {
      showError('No se pudieron guardar las preferencias');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Preferencias de notificaciones</Text>
      <Text style={styles.sectionDesc}>Elige qué alertas quieres recibir sobre tu tienda.</Text>

      <ToggleRow label="Productos con pocas existencias" desc="Te avisamos cuando un producto esté por agotarse" value={notifyLowStock} onChange={setNotifyLowStock} />
      <ToggleRow label="Productos por vencer" desc="Te avisamos cuando un producto esté próximo a vencer" value={notifyExpiry} onChange={setNotifyExpiry} />
      <ToggleRow label="Fiados pendientes" desc="Te avisamos sobre deudas pendientes de clientes" value={notifyDebts} onChange={setNotifyDebts} />

      <Button onPress={handleSave} loading={saving} size="md" fullWidth style={{ marginTop: spacing.md }}>
        Guardar preferencias
      </Button>
    </Card>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={() => onChange(!value)}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{desc}</Text>
      </View>
      <View style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
      </View>
    </TouchableOpacity>
  );
}

function AccountSettings({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  return (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Mi cuenta</Text>
      <InfoRow label="Correo" value={user?.email || ''} icon={<Mail color={colors.textSecondary} size={16} strokeWidth={2} />} />
      <InfoRow label="ID de usuario" value={user?.id?.slice(0, 8) + '...' || ''} />

      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Cerrar sesión</Text>
        <Text style={styles.dangerDesc}>Sal de tu cuenta en este dispositivo.</Text>
        <Button
          onPress={() => {
            confirmAction('¿Seguro que deseas cerrar sesión?', async () => {
              await onSignOut();
            });
          }}
          variant="danger"
          size="md"
          fullWidth
          style={{ marginTop: spacing.sm }}
        >
          <LogOut color={colors.white} size={16} strokeWidth={2} />
          <Text style={{ color: colors.white }}>Cerrar sesión</Text>
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { maxWidth: 700, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  sectionsList: { gap: spacing.sm, marginBottom: spacing.lg },
  sectionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, ...shadows.sm },
  sectionBtnActive: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  sectionText: { fontSize: typography.body, color: colors.text, fontFamily: typography.fontFamilyMedium },
  sectionTextActive: { color: colors.primary[700], fontFamily: typography.fontFamilyBold },
  sectionCard: { marginBottom: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  sectionDesc: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginBottom: spacing.md, lineHeight: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  infoRowIcon: {},
  infoRowLabel: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  infoRowValue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text, textAlign: 'right', flex: 1 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, fontSize: typography.bodySmall, padding: spacing.lg, fontFamily: typography.fontFamilyRegular },
  catList: { gap: spacing.sm },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  catRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catDot: { width: 12, height: 12, borderRadius: 6 },
  catRowName: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyMedium, color: colors.text },
  catRowActions: { flexDirection: 'row', gap: 6 },
  catEditBtn: { padding: 8, borderRadius: 6, backgroundColor: colors.primary[50] },
  catDeleteBtn: { padding: 8, borderRadius: 6, backgroundColor: '#FEE2E2' },
  catModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  catModalCard: { width: 380, maxWidth: '100%', padding: spacing.lg },
  catModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  catModalTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  inputLabel: { fontSize: typography.bodySmall, color: colors.text, marginBottom: spacing.xs, fontFamily: typography.fontFamilyMedium },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  colorOption: { width: 32, height: 32, borderRadius: 16 },
  colorSelected: { borderWidth: 3, borderColor: colors.text },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  paymentInfo: { flex: 1 },
  paymentLabel: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  paymentDesc: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },
  toggleDesc: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: colors.neutral[300], justifyContent: 'center', padding: 2 },
  toggleOn: { backgroundColor: colors.primary[600] },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white, ...shadows.sm },
  toggleKnobOn: { transform: [{ translateX: 20 }] },
  dangerZone: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  dangerTitle: { fontSize: typography.body, fontFamily: typography.fontFamilyBold, color: colors.error },
  dangerDesc: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 4 },
});
