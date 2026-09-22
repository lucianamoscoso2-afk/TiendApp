import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Dimensions, Platform } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { Card, Button, Input, Select, Badge, EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/format';
import { showSuccess, showError, confirmAction } from '@/lib/alerts';
import type { Promotion } from '@/lib/types';
import {
  Megaphone, Plus, X, Pencil, Trash2, Tag, Calendar, Percent,
  TrendingDown, Share2, Eye
} from 'lucide-react-native';

export default function MarketingScreen() {
  const { store } = useAuth();
  const { promotions, products, loading, refresh, storeId } = useStoreData();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [showPreview, setShowPreview] = useState<Promotion | null>(null);

  if (loading) return <Loading message="Cargando promociones..." />;

  const activePromos = promotions.filter(p => p.status === 'active');
  const expiredPromos = promotions.filter(p => p.status === 'expired' || new Date(p.end_date) < new Date());

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Marketing"
        subtitle="Crea promociones para tus productos"
        right={
          <Button onPress={() => { setEditing(null); setShowForm(true); }} size="sm">
            <Plus color={colors.white} size={18} strokeWidth={2.5} />
            <Text style={{ color: colors.white }}>Nueva promo</Text>
          </Button>
        }
      />

      <View style={styles.content}>
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Promociones activas</Text>
            <Text style={styles.summaryValue}>{activePromos.length}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total promociones</Text>
            <Text style={styles.summaryValue}>{promotions.length}</Text>
          </Card>
        </View>

        {promotions.length === 0 ? (
          <EmptyState
            icon={<Megaphone color={colors.neutral[300]} size={48} strokeWidth={2} />}
            title="No hay promociones"
            message="Crea promociones para atraer más clientes a tu tienda"
            action={<Button onPress={() => { setEditing(null); setShowForm(true); }}>Crear promoción</Button>}
          />
        ) : (
          <View style={styles.promoList}>
            <Text style={styles.sectionTitle}>Activas</Text>
            {activePromos.length === 0 ? (
              <Text style={styles.emptySection}>No hay promociones activas</Text>
            ) : (
              activePromos.map(promo => (
                <PromoCard
                  key={promo.id}
                  promo={promo}
                  onPreview={() => setShowPreview(promo)}
                  onEdit={() => { setEditing(promo); setShowForm(true); }}
                  onDelete={() => {
                    confirmAction('¿Eliminar esta promoción?', async () => {
                      await supabase.from('promotions').delete().eq('id', promo.id);
                      refresh();
                      showSuccess('Promoción eliminada');
                    });
                  }}
                />
              ))
            )}

            {expiredPromos.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Finalizadas</Text>
                {expiredPromos.map(promo => (
                  <PromoCard
                    key={promo.id}
                    promo={promo}
                    onPreview={() => setShowPreview(promo)}
                    onEdit={() => { setEditing(promo); setShowForm(true); }}
                    onDelete={() => {
                      confirmAction('¿Eliminar esta promoción?', async () => {
                        await supabase.from('promotions').delete().eq('id', promo.id);
                        refresh();
                        showSuccess('Promoción eliminada');
                      });
                    }}
                  />
                ))}
              </>
            )}
          </View>
        )}
      </View>

      <PromoFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        promotion={editing}
        products={products.filter(p => p.active)}
        storeId={storeId || ''}
        onSaved={() => { refresh(); setShowForm(false); }}
      />

      <PreviewModal promotion={showPreview} onClose={() => setShowPreview(null)} storeName={store?.name || ''} />
    </ScrollView>
  );
}

function PromoCard({ promo, onPreview, onEdit, onDelete }: {
  promo: Promotion;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const discount = promo.original_price > 0 ? ((Number(promo.original_price) - Number(promo.promo_price)) / Number(promo.original_price)) * 100 : 0;
  const isExpired = new Date(promo.end_date) < new Date() || promo.status === 'expired';

  return (
    <Card style={styles.promoCard}>
      <View style={styles.promoTop}>
        <View style={styles.promoInfo}>
          <Text style={styles.promoTitle}>{promo.title}</Text>
          {promo.product?.name && <Text style={styles.promoProduct}>{promo.product.name}</Text>}
        </View>
        <Badge variant={isExpired ? 'neutral' : 'success'} size="sm">
          {isExpired ? 'Finalizada' : 'Activa'}
        </Badge>
      </View>

      {promo.description && <Text style={styles.promoDesc}>{promo.description}</Text>}

      <View style={styles.promoPrices}>
        <View style={styles.promoPriceItem}>
          <Text style={styles.promoPriceLabel}>Antes</Text>
          <Text style={styles.promoPriceOld}>{formatCurrency(Number(promo.original_price))}</Text>
        </View>
        <View style={styles.promoPriceItem}>
          <Text style={styles.promoPriceLabel}>Ahora</Text>
          <Text style={styles.promoPriceNew}>{formatCurrency(Number(promo.promo_price))}</Text>
        </View>
        <View style={styles.promoDiscount}>
          <Percent color={colors.success} size={14} strokeWidth={2} />
          <Text style={styles.promoDiscountText}>{discount.toFixed(0)}% off</Text>
        </View>
      </View>

      <View style={styles.promoDates}>
        <Calendar color={colors.textSecondary} size={14} strokeWidth={2} />
        <Text style={styles.promoDateText}>{formatDate(promo.start_date)} - {formatDate(promo.end_date)}</Text>
      </View>

      <View style={styles.promoActions}>
        <TouchableOpacity style={styles.promoActionBtn} onPress={onPreview}>
          <Eye color={colors.primary[600]} size={16} strokeWidth={2} />
          <Text style={styles.promoActionText}>Vista previa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.promoActionBtn} onPress={onEdit}>
          <Pencil color={colors.primary[600]} size={16} strokeWidth={2} />
          <Text style={styles.promoActionText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.promoActionBtn} onPress={onDelete}>
          <Trash2 color={colors.error} size={16} strokeWidth={2} />
          <Text style={[styles.promoActionText, { color: colors.error }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

function PromoFormModal({ visible, onClose, promotion, products, storeId, onSaved }: {
  visible: boolean;
  onClose: () => void;
  promotion: Promotion | null;
  products: any[];
  storeId: string;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [startDate, setStartDate] = useState(formatDateInput(new Date()));
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useMemo(() => {
    setTitle(promotion?.title || '');
    setDescription(promotion?.description || '');
    setProductId(promotion?.product_id || '');
    setPromoPrice(promotion ? String(promotion.promo_price) : '');
    setStartDate(promotion ? formatDateInput(promotion.start_date) : formatDateInput(new Date()));
    setEndDate(promotion ? formatDateInput(promotion.end_date) : '');
    setError(null);
  }, [promotion]);

  const selectedProduct = products.find(p => p.id === productId);
  const originalPrice = selectedProduct ? Number(selectedProduct.sale_price) : (promotion ? Number(promotion.original_price) : 0);
  const discount = originalPrice > 0 && parseFloat(promoPrice) > 0 ? ((originalPrice - parseFloat(promoPrice)) / originalPrice) * 100 : 0;

  const handleSave = async () => {
    if (!title.trim()) { setError('Ingresa un título'); return; }
    if (!productId) { setError('Selecciona un producto'); return; }
    if (!promoPrice || parseFloat(promoPrice) < 0) { setError('Ingresa un precio promocional válido'); return; }
    if (!endDate) { setError('Selecciona una fecha de fin'); return; }

    setSaving(true);
    setError(null);
    try {
      const data = {
        store_id: storeId,
        product_id: productId,
        title: title.trim(),
        description: description.trim() || null,
        promo_price: parseFloat(promoPrice),
        original_price: originalPrice,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        status: new Date(endDate) < new Date() ? 'expired' : 'active',
      };
      if (promotion) {
        const { error } = await supabase.from('promotions').update(data).eq('id', promotion.id);
        if (error) throw error;
        showSuccess('Promoción actualizada');
      } else {
        const { error } = await supabase.from('promotions').insert(data);
        if (error) throw error;
        showSuccess('Promoción creada');
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
            <Text style={styles.formTitle}>{promotion ? 'Editar promoción' : 'Nueva promoción'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            <Input label="Título de la promoción" value={title} onChangeText={setTitle} placeholder="Ej: Oferta del día" />
            <Select
              label="Producto"
              value={productId}
              onValueChange={setProductId}
              placeholder="Seleccionar producto"
              options={products.map(p => ({ label: `${p.name} - ${formatCurrency(Number(p.sale_price))}`, value: p.id }))}
            />
            {selectedProduct && (
              <View style={styles.priceInfo}>
                <Text style={styles.priceInfoLabel}>Precio normal: {formatCurrency(Number(selectedProduct.sale_price))}</Text>
              </View>
            )}
            <Input label="Precio promocional" value={promoPrice} onChangeText={setPromoPrice} placeholder="0" keyboardType="numeric" />
            {discount > 0 && (
              <View style={styles.discountPreview}>
                <TrendingDown color={colors.success} size={16} strokeWidth={2} />
                <Text style={styles.discountPreviewText}>Descuento del {discount.toFixed(0)}%</Text>
              </View>
            )}
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Input label="Fecha inicio" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
              </View>
              <View style={styles.formCol}>
                <Input label="Fecha fin" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
              </View>
            </View>
            <Input label="Descripción (opcional)" value={description} onChangeText={setDescription} placeholder="Descripción de la promoción" multiline />
            {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
            <Button onPress={handleSave} loading={saving} size="lg" fullWidth>
              {promotion ? 'Guardar cambios' : 'Crear promoción'}
            </Button>
            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </View>
        <View style={styles.modalBackdrop} />
      </View>
    </Modal>
  );
}

function PreviewModal({ promotion, onClose, storeName }: {
  promotion: Promotion | null;
  onClose: () => void;
  storeName: string;
}) {
  if (!promotion) return null;
  const discount = promotion.original_price > 0 ? ((Number(promotion.original_price) - Number(promotion.promo_price)) / Number(promotion.original_price)) * 100 : 0;

  const handleShare = () => {
    if (Platform.OS === 'web' && navigator.share) {
      navigator.share({
        title: promotion.title,
        text: `${promotion.title} - ${formatCurrency(Number(promotion.promo_price))} en ${storeName}`,
      });
    } else if (Platform.OS === 'web') {
      showSuccess('Función de compartir estará disponible pronto');
    }
  };

  return (
    <Modal visible={!!promotion} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.previewOverlay}>
        <View style={styles.previewCard}>
          <TouchableOpacity onPress={onClose} style={styles.previewClose}>
            <X color={colors.text} size={24} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.previewContent}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewStore}>{storeName}</Text>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>OFERTA</Text>
              </View>
            </View>
            <Text style={styles.previewTitle}>{promotion.title}</Text>
            {promotion.product?.name && <Text style={styles.previewProduct}>{promotion.product.name}</Text>}
            {promotion.description && <Text style={styles.previewDesc}>{promotion.description}</Text>}
            <View style={styles.previewPrices}>
              <Text style={styles.previewOldPrice}>{formatCurrency(Number(promotion.original_price))}</Text>
              <Text style={styles.previewNewPrice}>{formatCurrency(Number(promotion.promo_price))}</Text>
            </View>
            <View style={styles.previewDiscount}>
              <Text style={styles.previewDiscountText}>{discount.toFixed(0)}% DE DESCUENTO</Text>
            </View>
            <Text style={styles.previewDates}>Del {formatDate(promotion.start_date)} al {formatDate(promotion.end_date)}</Text>
          </View>
          <Button onPress={handleShare} variant="outline" size="md" fullWidth>
            <Share2 color={colors.primary[700]} size={18} strokeWidth={2} />
            <Text style={{ color: colors.primary[700] }}>Compartir</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { maxWidth: 700, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1 },
  summaryLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginBottom: 4 },
  summaryValue: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text },
  promoList: {},
  sectionTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: spacing.sm },
  emptySection: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, padding: spacing.md, textAlign: 'center' },
  promoCard: { marginBottom: spacing.sm },
  promoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  promoInfo: { flex: 1 },
  promoTitle: { fontSize: typography.body, fontFamily: typography.fontFamilyBold, color: colors.text },
  promoProduct: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },
  promoDesc: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginBottom: spacing.sm, lineHeight: 20 },
  promoPrices: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.sm },
  promoPriceItem: {},
  promoPriceLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  promoPriceOld: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyMedium, color: colors.neutral[400], textDecorationLine: 'line-through', marginTop: 2 },
  promoPriceNew: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.success, marginTop: 2 },
  promoDiscount: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  promoDiscountText: { fontSize: typography.caption, color: colors.success, fontFamily: typography.fontFamilyBold },
  promoDates: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  promoDateText: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  promoActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  promoActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.neutral[50] },
  promoActionText: { fontSize: typography.caption, color: colors.primary[700], fontFamily: typography.fontFamilyMedium },
  modalOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  formPanel: { width: 460, maxWidth: '95%', backgroundColor: colors.card, ...shadows.lg },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  formTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text },
  closeBtn: { padding: spacing.xs },
  formBody: { flex: 1, padding: spacing.lg },
  formRow: { flexDirection: 'row', gap: spacing.md },
  formCol: { flex: 1 },
  priceInfo: { backgroundColor: colors.neutral[50], borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  priceInfoLabel: { fontSize: typography.bodySmall, color: colors.text, fontFamily: typography.fontFamilyMedium },
  discountPreview: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  discountPreviewText: { fontSize: typography.bodySmall, color: colors.success, fontFamily: typography.fontFamilyBold },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#991B1B', fontSize: typography.bodySmall, fontFamily: typography.fontFamilyRegular },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  previewCard: { width: 360, maxWidth: '100%', backgroundColor: colors.card, borderRadius: radius.xl, ...shadows.lg, padding: spacing.lg, position: 'relative' },
  previewClose: { position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 1 },
  previewContent: { alignItems: 'center', paddingVertical: spacing.lg },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: spacing.lg },
  previewStore: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.primary[600] },
  previewBadge: { backgroundColor: colors.error, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  previewBadgeText: { color: colors.white, fontSize: 11, fontFamily: typography.fontFamilyBold },
  previewTitle: { fontSize: typography.h2, fontFamily: typography.fontFamilyBold, color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  previewProduct: { fontSize: typography.body, color: colors.textSecondary, fontFamily: typography.fontFamilyMedium, marginBottom: spacing.sm },
  previewDesc: { fontSize: typography.bodySmall, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 },
  previewPrices: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  previewOldPrice: { fontSize: typography.h4, color: colors.neutral[400], fontFamily: typography.fontFamilyMedium, textDecorationLine: 'line-through' },
  previewNewPrice: { fontSize: 28, color: colors.success, fontFamily: typography.fontFamilyBold },
  previewDiscount: { backgroundColor: colors.success, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 8, marginBottom: spacing.md },
  previewDiscountText: { color: colors.white, fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold },
  previewDates: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
});
