import { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useStoreData } from '@/lib/use-store-data';
import { colors, spacing, radius, shadows, typography } from '@/lib/theme';
import { ScreenHeader, Card, Loading } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  Bot, Send, Sparkles, TrendingUp, Package, Wallet,
  HandCoins, ShoppingBag, Users
} from 'lucide-react-native';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function TendiScreen() {
  const { sales, products, expenses, debts, customers, suppliers, purchases, loading } = useStoreData();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hola. Soy Tendi, tu asistente para la tienda. Puedes preguntarme sobre tus ventas, ganancias, gastos, inventario, fiados, clientes y más. ¿En qué te puedo ayudar hoy?',
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, thinking]);

  const suggestions = [
    '¿Cuánto he vendido hoy?',
    '¿Cuáles productos están agotados?',
    '¿Cuánto dinero me deben?',
    '¿Cuál es mi ganancia del mes?',
    '¿Qué productos se venden más?',
    '¿Cuánto he gastado este mes?',
  ];

  const generateResponse = (question: string): string => {
    const q = question.toLowerCase();
    const completedSales = sales.filter(s => s.status === 'completed');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (q.includes('hoy') && (q.includes('vend') || q.includes('venta'))) {
      const todaySales = completedSales.filter(s => new Date(s.sale_date) >= today);
      const total = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
      const items = todaySales.reduce((sum, s) => sum + (s.sale_items?.reduce((acc, i) => acc + Number(i.quantity), 0) || 0), 0);
      return `Hoy has registrado ${todaySales.length} ${todaySales.length === 1 ? 'venta' : 'ventas'} por un total de ${formatCurrency(total)}. Has vendido ${items} ${items === 1 ? 'artículo' : 'artículos'}.`;
    }

    if ((q.includes('agotado') || q.includes('sin stock') || q.includes('stock')) && q.includes('producto')) {
      const out = products.filter(p => p.active && Number(p.stock) <= 0);
      const low = products.filter(p => p.active && Number(p.stock) <= Number(p.min_stock) && Number(p.stock) > 0);
      if (out.length === 0 && low.length === 0) return 'Todos tus productos tienen suficiente inventario. No hay productos agotados ni con pocas existencias.';
      let response = '';
      if (out.length > 0) response += `Tienes ${out.length} ${out.length === 1 ? 'producto agotado' : 'productos agotados'}: ${out.slice(0, 5).map(p => p.name).join(', ')}${out.length > 5 ? '...' : ''}.\n`;
      if (low.length > 0) response += `Además, ${low.length} ${low.length === 1 ? 'producto tiene' : 'productos tienen'} pocas existencias: ${low.slice(0, 5).map(p => `${p.name} (${p.stock})`).join(', ')}${low.length > 5 ? '...' : ''}.`;
      return response || 'No hay problemas de inventario.';
    }

    if (q.includes('fiado') || q.includes('deben') || q.includes('deuda') || q.includes('cobrar')) {
      const pending = debts.filter(d => d.status === 'pending');
      const total = pending.reduce((sum, d) => sum + Number(d.balance), 0);
      if (pending.length === 0) return 'No tienes dinero pendiente por cobrar. Todos los fiados están al día.';
      return `Tienes ${formatCurrency(total)} pendientes por cobrar de ${pending.length} ${pending.length === 1 ? 'fiado' : 'fiados'}. Los clientes con deudas son: ${pending.slice(0, 5).map(d => `${d.customer?.name} (${formatCurrency(Number(d.balance))})`).join(', ')}${pending.length > 5 ? '...' : ''}.`;
    }

    if ((q.includes('ganancia') || q.includes('rentab') || q.includes('utilidad')) && (q.includes('mes') || q.includes('este'))) {
      const monthSales = completedSales.filter(s => new Date(s.sale_date) >= startOfMonth);
      const monthExp = expenses.filter(e => new Date(e.expense_date) >= startOfMonth).reduce((sum, e) => sum + Number(e.amount), 0);
      const revenue = monthSales.reduce((sum, s) => sum + Number(s.total), 0);
      const profit = revenue - monthExp;
      return `Este mes tus ingresos son ${formatCurrency(revenue)} y tus gastos son ${formatCurrency(monthExp)}. Tu ganancia estimada es de ${formatCurrency(profit)}. ${profit > 0 ? 'Vas bien, estás ganando dinero.' : 'Estás perdiendo dinero este mes. Revisa tus gastos.'}`;
    }

    if (q.includes('vend') && q.includes('mas') || q.includes('mas vendido') || q.includes('top') || q.includes('popular')) {
      const productMap: Record<string, { name: string; qty: number }> = {};
      completedSales.forEach(s => {
        s.sale_items?.forEach(item => {
          const key = item.product_id || item.product_name;
          if (!productMap[key]) productMap[key] = { name: item.product_name, qty: 0 };
          productMap[key].qty += Number(item.quantity);
        });
      });
      const sorted = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
      if (sorted.length === 0) return 'Aún no tienes ventas registradas para analizar.';
      return `Tus productos más vendidos son:\n${sorted.map((p, i) => `${i + 1}. ${p.name} - ${p.qty} unidades`).join('\n')}`;
    }

    if (q.includes('gasto') && (q.includes('mes') || q.includes('este'))) {
      const monthExp = expenses.filter(e => new Date(e.expense_date) >= startOfMonth);
      const total = monthExp.reduce((sum, e) => sum + Number(e.amount), 0);
      const byCat: Record<string, number> = {};
      monthExp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
      const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return `Este mes has gastado ${formatCurrency(total)} en ${monthExp.length} ${monthExp.length === 1 ? 'gasto' : 'gastos'}. Los mayores gastos son: ${sorted.map(([cat, amt]) => `${cat} (${formatCurrency(amt)})`).join(', ')}.`;
    }

    if (q.includes('inventario') || q.includes('valor') && q.includes('producto')) {
      const totalValue = products.filter(p => p.active).reduce((sum, p) => sum + Number(p.purchase_price) * Number(p.stock), 0);
      const totalSale = products.filter(p => p.active).reduce((sum, p) => sum + Number(p.sale_price) * Number(p.stock), 0);
      return `Tu inventario tiene ${products.filter(p => p.active).length} productos. El valor de compra es ${formatCurrency(totalValue)} y el valor de venta potencial es ${formatCurrency(totalSale)}.`;
    }

    if (q.includes('cliente')) {
      const withDebt = customers.filter(c => Number(c.outstanding_balance) > 0);
      return `Tienes ${customers.length} clientes registrados. ${withDebt.length} ${withDebt.length === 1 ? 'cliente tiene' : 'clientes tienen'} saldos pendientes por un total de ${formatCurrency(withDebt.reduce((sum, c) => sum + Number(c.outstanding_balance), 0))}.`;
    }

    if (q.includes('proveedor')) {
      return `Tienes ${suppliers.length} proveedores registrados. Has hecho ${purchases.length} compras en total por un valor de ${formatCurrency(purchases.reduce((sum, p) => sum + Number(p.total), 0))}.`;
    }

    if (q.includes('hola') || q.includes('buenos') || q.includes('ayuda')) {
      return 'Hola. Soy Tendi. Puedes preguntarme sobre tus ventas, gastos, ganancias, inventario, fiados, clientes y proveedores. Por ejemplo: "¿Cuánto he vendido hoy?" o "¿Cuánto me deben?".';
    }

    return 'Puedo ayudarte con información sobre tus ventas, gastos, ganancias, inventario, fiados, clientes y proveedores. Prueba preguntando: "¿Cuánto he vendido hoy?", "¿Qué productos están agotados?", o "¿Cuál es mi ganancia del mes?".';
  };

  const handleSend = (text?: string) => {
    const message = (text || input).trim();
    if (!message) return;
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const response = generateResponse(message);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setThinking(false);
    }, 600);
  };

  if (loading) return <Loading message="Cargando Tendi..." />;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Tendi" subtitle="Tu asistente inteligente" />

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        enabled
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, i) => (
            <View key={i} style={[styles.messageRow, msg.role === 'user' && styles.messageRowUser]}>
              {msg.role === 'assistant' && (
                <View style={styles.botAvatar}>
                  <Bot color={colors.white} size={18} strokeWidth={2.5} />
                </View>
              )}
              <View style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : styles.assistantText]}>
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}

          {thinking && (
            <View style={styles.messageRow}>
              <View style={styles.botAvatar}>
                <Bot color={colors.white} size={18} strokeWidth={2.5} />
              </View>
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <View style={styles.thinkingDots}>
                  <View style={styles.thinkingDot} />
                  <View style={styles.thinkingDot} />
                  <View style={styles.thinkingDot} />
                </View>
              </View>
            </View>
          )}

          {messages.length <= 1 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionsTitle}>Preguntas sugeridas</Text>
              <View style={styles.suggestionsGrid}>
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => handleSend(s)}
                  >
                    <Sparkles color={colors.primary[600]} size={14} strokeWidth={2} />
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor={colors.neutral[400]}
            onKeyPress={(e: any) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault?.();
                handleSend();
              }
            }}
            multiline
          />
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={() => handleSend()}
            disabled={!input.trim()}
          >
            <Send color={colors.white} size={20} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  chatContainer: { flex: 1, maxWidth: 800, width: '100%', alignSelf: 'center' },
  messagesList: { flex: 1 },
  messagesContent: { padding: spacing.lg, paddingBottom: spacing.sm },
  messageRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, maxWidth: '85%', alignSelf: 'flex-start' },
  messageRowUser: { alignSelf: 'flex-end', maxWidth: '80%' },
  botAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  messageBubble: { borderRadius: radius.lg, padding: spacing.md, ...shadows.sm },
  userBubble: { backgroundColor: colors.primary[600] },
  assistantBubble: { backgroundColor: colors.card },
  messageText: { fontSize: typography.bodySmall, lineHeight: 20, fontFamily: typography.fontFamilyRegular },
  userText: { color: colors.white },
  assistantText: { color: colors.text },
  thinkingDots: { flexDirection: 'row', gap: 4, padding: 4 },
  thinkingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.neutral[300] },
  suggestionsSection: { marginTop: spacing.xl },
  suggestionsTitle: { fontSize: typography.bodySmall, fontFamily: typography.fontFamilyBold, color: colors.textSecondary, marginBottom: spacing.sm },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  suggestionText: { fontSize: typography.caption, color: colors.primary[700], fontFamily: typography.fontFamilyMedium },
  inputRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  textInput: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: typography.body, color: colors.text, fontFamily: typography.fontFamilyRegular, backgroundColor: colors.background, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center' },
});
