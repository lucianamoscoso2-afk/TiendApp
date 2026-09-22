export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
  return formatted;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateInput(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return formatDate(d);
  if (days > 0) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
  if (hours > 0) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  if (minutes > 0) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  return 'hace un momento';
}

export function daysUntil(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    nequi: 'Nequi',
    daviplata: 'Daviplata',
    fiado: 'Fiado',
    otro: 'Otro',
  };
  return labels[method] || method;
}

export function getExpenseCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    mercancia: 'Mercancía',
    arriendo: 'Arriendo',
    servicios: 'Servicios públicos',
    transporte: 'Transporte',
    mantenimiento: 'Mantenimiento',
    administrativos: 'Administrativos',
    salarios: 'Salarios',
    otros: 'Otros',
  };
  return labels[category] || category;
}
