import { Alert, Platform } from 'react-native';

export function showSuccess(message: string, title: string = 'Listo') {
  if (Platform.OS === 'web') {
    // Lightweight toast for web
    showToast(message, 'success');
  } else {
    Alert.alert(title, message);
  }
}

export function showError(message: string, title: string = 'Error') {
  if (Platform.OS === 'web') {
    showToast(message, 'error');
  } else {
    Alert.alert(title, message);
  }
}

export function showWarning(message: string, title: string = 'Atención') {
  if (Platform.OS === 'web') {
    showToast(message, 'warning');
  } else {
    Alert.alert(title, message);
  }
}

export function confirmAction(
  message: string,
  onConfirm: () => void,
  title: string = 'Confirmar',
  confirmText: string = 'Sí, continuar',
  cancelText: string = 'Cancelar'
) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) {
      onConfirm();
    }
  } else {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel' },
        { text: confirmText, style: 'destructive', onPress: onConfirm },
      ]
    );
  }
}

type ToastType = 'success' | 'error' | 'warning' | 'info';

let toastContainer: HTMLElement | null = null;

function showToast(message: string, type: ToastType) {
  if (typeof document === 'undefined') return;

  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 380px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgColors: Record<ToastType, string> = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  };
  const icons: Record<ToastType, string> = {
    success: '\u2713',
    error: '\u2717',
    warning: '\u26A0',
    info: '\u2139',
  };

  toast.style.cssText = `
    background: white;
    border-left: 4px solid ${bgColors[type]};
    border-radius: 12px;
    padding: 14px 18px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideIn 0.3s ease;
    min-width: 280px;
  `;

  toast.innerHTML = `
    <span style="color: ${bgColors[type]}; font-size: 20px; font-weight: bold;">${icons[type]}</span>
    <span style="color: #1a1a1a; font-size: 14px; flex: 1; line-height: 1.4;">${message}</span>
  `;

  // Add animation
  if (!document.getElementById('toast-anim')) {
    const style = document.createElement('style');
    style.id = 'toast-anim';
    style.textContent = `
      @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes slideOut { to { transform: translateX(100%); opacity: 0; } }
    `;
    document.head.appendChild(style);
  }

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}
