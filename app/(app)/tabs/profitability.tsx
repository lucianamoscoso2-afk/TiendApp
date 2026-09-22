import { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { formatCurrency, formatNumber } from '@/lib/format';
import { Card, Badge, EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { ProgressBar } from '@/components/charts';
import {
  TrendingUp, TrendingDown, Package, Award, AlertTriangle, Percent,
} from 'lucide-react-native';
import type { Product, Category } from '@/lib/types';

// ----- Helpers -----

interface ProductProfit {
  product: Product;
  purchasePrice: number;
  salePrice: number;
  profitPerUnit: number;
  margin: number; // percentage
  potentialProfit: number; // profit * stock
}

function computeProfit(product: Product): ProductProfit {
  const purchasePrice = Number(product.purchase_price) || 0;
  const salePrice = Number(product.sale_price) || 0;
  const stock = Number(product.stock) || 0;
  const profitPerUnit = salePrice - purchasePrice;
  const margin = purchasePrice > 0 ? (profitPerUnit / purchasePrice) * 100 : 0;
  const potentialProfit = profitPerUnit * stock;
  return { product, purchasePrice, salePrice, profitPerUnit, margin, potentialProfit };
}

function marginVariant(margin: number): 'success' | 'warning' | 'error' {
  if (margin >= 30) return 'success';
  if (margin >= 15) return 'warning';
  return 'error';
}

function marginLabel(margin: number): string {
  if (margin >= 30) return 'Alta rentabilidad';
  if (margin >= 15) return 'Rentabilidad media';
  return 'Baja rentabilidad';
}

function categoryName(product: Product, categories: Category[]): string {
  if (product.category?.name) return product.category.name;
  if (product.category_id) {
    const found = categories.find(c => c.id === product.category_id);
    if (found) return found.name;
  }
  return 'Sin categoría';
}

// ----- Screen -----

export default function ProfitabilityScreen() {
  const { products, categories, loading } = useStoreData();

  const activeProducts = useMemo(
    () => products.filter(p => p.active),
    [products],
  );

  const profits = useMemo(
    () => activeProducts.map(computeProfit),
    [activeProducts],
  );

  // Summary metrics
  const summary = useMemo(() => {
    const totalPotentialProfit = profits.reduce((sum, p) => sum + p.potentialProfit, 0);
    const validMargins = profits.filter(p => p.purchasePrice > 0);
    const averageMargin = validMargins.length > 0
      ? validMargins.reduce((sum, p) => sum + p.margin, 0) / validMargins.length
      : 0;

    let mostProfitable: ProductProfit | null = null;
    let leastProfitable: ProductProfit | null = null;
    for (const p of profits) {
      if (p.purchasePrice <= 0) continue;
      if (!mostProfitable || p.margin > mostProfitable.margin) mostProfitable = p;
      if (!leastProfitable || p.margin < leastProfitable.margin) leastProfitable = p;
    }

    return { totalPotentialProfit, averageMargin, mostProfitable, leastProfitable };
  }, [profits]);

  // Products sorted by margin descending
  const sortedByMargin = useMemo(
    () => [...profits].sort((a, b) => b.margin - a.margin),
    [profits],
  );

  const maxMargin = useMemo(
    () => profits.reduce((max, p) => (p.margin > max ? p.margin : max), 0),
    [profits],
  );

  // Group by category
  const byCategory = useMemo(() => {
    const groups = new Map<string, { name: string; items: ProductProfit[] }>();
    for (const p of profits) {
      const name = categoryName(p.product, categories);
      const key = name;
      if (!groups.has(key)) groups.set(key, { name, items: [] });
      groups.get(key)!.items.push(p);
    }
    return Array.from(groups.values())
      .map(g => {
        const totalPotential = g.items.reduce((s, p) => s + p.potentialProfit, 0);
        const valid = g.items.filter(p => p.purchasePrice > 0);
        const avgMargin = valid.length > 0
          ? valid.reduce((s, p) => s + p.margin, 0) / valid.length
          : 0;
        return { name: g.name, totalPotential, avgMargin, count: g.items.length };
      })
      .sort((a, b) => b.totalPotential - a.totalPotential);
  }, [profits, categories]);

  // Low profitability products (margin < 15%)
  const lowProfit = useMemo(
    () => sortedByMargin.filter(p => p.purchasePrice > 0 && p.margin < 15),
    [sortedByMargin],
  );

  if (loading) {
    return <Loading message="Cargando rentabilidad..." />;
  }

  if (activeProducts.length === 0) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Rentabilidad"
          subtitle="Analiza las ganancias de tus productos"
        />
        <View style={styles.content}>
          <EmptyState
            icon={<Package color={colors.neutral[300]} size={48} strokeWidth={2} />}
            title="No hay productos para analizar"
            message="Agrega productos con precio de compra y precio de venta para ver el análisis de rentabilidad."
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Rentabilidad"
        subtitle="Analiza las ganancias de tus productos"
      />

      <View style={styles.content}>
        {/* Summary cards */}
        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.primary[50] }]}>
                <TrendingUp color={colors.primary[700]} size={20} strokeWidth={2.5} />
              </View>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalPotentialProfit)}</Text>
            <Text style={styles.summaryLabel}>Ganancia total potencial</Text>
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.primary[50] }]}>
                <Percent color={colors.primary[700]} size={20} strokeWidth={2.5} />
              </View>
            </View>
            <Text style={styles.summaryValue}>{formatNumber(summary.averageMargin)}%</Text>
            <Text style={styles.summaryLabel}>Margen promedio</Text>
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.primary[50] }]}>
                <Award color={colors.primary[700]} size={20} strokeWidth={2.5} />
              </View>
            </View>
            <Text style={styles.summaryValueSmall} numberOfLines={1}>
              {summary.mostProfitable?.product.name || '—'}
            </Text>
            <Text style={styles.summaryLabel}>Producto más rentable</Text>
            {summary.mostProfitable && (
              <Text style={styles.summaryHint}>
                {formatNumber(summary.mostProfitable.margin)}% de margen
              </Text>
            )}
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.summaryIcon, { backgroundColor: '#FEE2E2' }]}>
                <TrendingDown color={colors.error} size={20} strokeWidth={2.5} />
              </View>
            </View>
            <Text style={styles.summaryValueSmall} numberOfLines={1}>
              {summary.leastProfitable?.product.name || '—'}
            </Text>
            <Text style={styles.summaryLabel}>Producto menos rentable</Text>
            {summary.leastProfitable && (
              <Text style={styles.summaryHint}>
                {formatNumber(summary.leastProfitable.margin)}% de margen
              </Text>
            )}
          </Card>
        </View>

        {/* Rentabilidad por producto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rentabilidad por producto</Text>
          <Text style={styles.sectionSubtitle}>
            {activeProducts.length} {activeProducts.length === 1 ? 'producto activo' : 'productos activos'}, ordenados por margen
          </Text>

          <View style={styles.productList}>
            {sortedByMargin.map(p => (
              <Card key={p.product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <View style={styles.productNameWrap}>
                    <Text style={styles.productName} numberOfLines={1}>{p.product.name}</Text>
                    <Text style={styles.productStock}>
                      Stock: {formatNumber(Number(p.product.stock) || 0)} {p.product.unit}
                    </Text>
                  </View>
                  <Badge variant={marginVariant(p.margin)} size="sm">
                    {marginLabel(p.margin)}
                  </Badge>
                </View>

                <View style={styles.priceRow}>
                  <View style={styles.priceCell}>
                    <Text style={styles.priceLabel}>Compra</Text>
                    <Text style={styles.priceValue}>{formatCurrency(p.purchasePrice)}</Text>
                  </View>
                  <View style={styles.priceCell}>
                    <Text style={styles.priceLabel}>Venta</Text>
                    <Text style={styles.priceValue}>{formatCurrency(p.salePrice)}</Text>
                  </View>
                  <View style={styles.priceCell}>
                    <Text style={styles.priceLabel}>Ganancia/unit</Text>
                    <Text style={[styles.priceValue, { color: colors.primary[700] }]}>
                      {formatCurrency(p.profitPerUnit)}
                    </Text>
                  </View>
                  <View style={styles.priceCell}>
                    <Text style={styles.priceLabel}>Margen</Text>
                    <Text style={styles.priceValue}>{formatNumber(p.margin)}%</Text>
                  </View>
                </View>

                <View style={styles.progressWrap}>
                  <ProgressBar
                    value={p.margin}
                    max={maxMargin || 1}
                    color={p.margin >= 30 ? colors.success : p.margin >= 15 ? colors.warning : colors.error}
                    height={8}
                  />
                </View>

                <Text style={styles.potentialProfit}>
                  Ganancia potencial: {formatCurrency(p.potentialProfit)}
                </Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Rentabilidad por categoría */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rentabilidad por categoría</Text>
          <Text style={styles.sectionSubtitle}>
            {byCategory.length} {byCategory.length === 1 ? 'categoría' : 'categorías'}
          </Text>

          <View style={styles.categoryList}>
            {byCategory.map(cat => (
              <Card key={cat.name} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
                  <Badge variant="primary" size="sm">
                    {cat.count} {cat.count === 1 ? 'producto' : 'productos'}
                  </Badge>
                </View>
                <View style={styles.categoryStats}>
                  <View style={styles.categoryStat}>
                    <Text style={styles.categoryStatLabel}>Ganancia potencial</Text>
                    <Text style={styles.categoryStatValue}>{formatCurrency(cat.totalPotential)}</Text>
                  </View>
                  <View style={styles.categoryStat}>
                    <Text style={styles.categoryStatLabel}>Margen promedio</Text>
                    <Text style={styles.categoryStatValue}>{formatNumber(cat.avgMargin)}%</Text>
                  </View>
                </View>
                <View style={styles.progressWrap}>
                  <ProgressBar
                    value={cat.avgMargin}
                    max={Math.max(maxMargin, 1)}
                    color={colors.primary[500]}
                    height={6}
                  />
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* Productos con baja rentabilidad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos con baja rentabilidad</Text>
          <Text style={styles.sectionSubtitle}>Margen menor al 15%</Text>

          {lowProfit.length === 0 ? (
            <Card style={styles.allGoodCard}>
              <View style={styles.allGoodRow}>
                <View style={[styles.summaryIcon, { backgroundColor: colors.primary[50] }]}>
                  <TrendingUp color={colors.primary[700]} size={20} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.allGoodTitle}>Todos tus productos tienen buen margen</Text>
                  <Text style={styles.allGoodMessage}>
                    No hay productos con margen inferior al 15%. ¡Buen trabajo!
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <>
              <Card style={styles.warningCard}>
                <View style={styles.warningRow}>
                  <AlertTriangle color={colors.warning} size={20} strokeWidth={2.5} />
                  <Text style={styles.warningText}>
                    Tienes {lowProfit.length} {lowProfit.length === 1 ? 'producto' : 'productos'} con baja rentabilidad. Considera ajustar los precios o renegociar los costos de compra.
                  </Text>
                </View>
              </Card>

              <View style={styles.productList}>
                {lowProfit.map(p => (
                  <Card key={p.product.id} style={styles.productCard}>
                    <View style={styles.productHeader}>
                      <View style={styles.productNameWrap}>
                        <Text style={styles.productName} numberOfLines={1}>{p.product.name}</Text>
                        <Text style={styles.productStock}>
                          Compra {formatCurrency(p.purchasePrice)} · Venta {formatCurrency(p.salePrice)}
                        </Text>
                      </View>
                      <Badge variant="error" size="sm">{formatNumber(p.margin)}%</Badge>
                    </View>
                    <Text style={styles.potentialProfit}>
                      Ganancia por unidad: {formatCurrency(p.profitPerUnit)}
                    </Text>
                  </Card>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { maxWidth: 900, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  // Summary
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  summaryCard: { flex: 1, minWidth: 160 },
  summaryIconRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm },
  summaryIcon: { width: 40, height: 40, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  summaryValue: { fontSize: typography.h3, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: 2 },
  summaryValueSmall: { fontSize: typography.body, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: 2 },
  summaryLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular },
  summaryHint: { fontSize: typography.caption, color: colors.primary[700], fontFamily: typography.fontFamilyMedium, marginTop: 2 },

  // Sections
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: typography.h4, fontFamily: typography.fontFamilyBold, color: colors.text, marginBottom: 2 },
  sectionSubtitle: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginBottom: spacing.md },

  // Product list
  productList: { gap: spacing.sm },
  productCard: {},
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  productNameWrap: { flex: 1 },
  productName: { fontSize: typography.body, fontFamily: typography.fontFamilyBold, color: colors.text },
  productStock: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginTop: 2 },

  priceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  priceCell: { flex: 1 },
  priceLabel: { fontSize: 11, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginBottom: 2 },
  priceValue: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.text },

  progressWrap: { marginBottom: spacing.sm },
  potentialProfit: { fontSize: typography.caption, color: colors.primary[700], fontFamily: typography.fontFamilyMedium },

  // Category
  categoryList: { gap: spacing.sm },
  categoryCard: {},
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  categoryName: { fontSize: typography.body, fontFamily: typography.fontFamilyBold, color: colors.text, flex: 1 },
  categoryStats: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm },
  categoryStat: { flex: 1 },
  categoryStatLabel: { fontSize: typography.caption, color: colors.textSecondary, fontFamily: typography.fontFamilyRegular, marginBottom: 2 },
  categoryStatValue: { fontSize: typography.body, fontFamily: typography.fontFamilyBold, color: colors.text },

  // Low profitability
  warningCard: { marginBottom: spacing.sm, backgroundColor: '#FFFBEB' },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  warningText: { flex: 1, fontSize: typography.bodySmall, color: '#92400E', fontFamily: typography.fontFamilyRegular, lineHeight: 20 },

  allGoodCard: { backgroundColor: colors.primary[50] },
  allGoodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  allGoodTitle: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.primary[800], marginBottom: 2 },
  allGoodMessage: { fontSize: typography.caption, color: colors.primary[700], fontFamily: typography.fontFamilyRegular, lineHeight: 18 },
});
