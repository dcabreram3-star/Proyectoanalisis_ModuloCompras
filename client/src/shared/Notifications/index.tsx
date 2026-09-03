import { ToastProvider } from './ToastProvider';
import { ConfirmProvider } from './ConfirmProvider';

// Junta todos los providers de notificaciones del sistema en uno solo.
// Cualquier CRUD del proyecto usa useToast() y useConfirm() sin
// preocuparse por dónde están declarados estos providers.
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}

export { useToast } from './ToastProvider';
export { useConfirm } from './ConfirmProvider';