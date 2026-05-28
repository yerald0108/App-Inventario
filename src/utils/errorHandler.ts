import Toast from 'react-native-toast-message';
import { Alert } from 'react-native';

/**
 * Manejador centralizado de errores.
 * Imprime en consola para debug y muestra el error al usuario vía Toast o Alert.
 */
export function handleError(
  error: unknown,
  context?: string,
  type: 'toast' | 'alert' = 'toast'
) {
  // Siempre loggeamos a consola para depuración local
  console.error(`[Error] ${context ? context + ': ' : ''}`, error);

  const mensaje = error instanceof Error ? error.message : 'Ocurrió un error inesperado';

  if (type === 'toast') {
    Toast.show({
      type: 'error',
      text1: context ?? 'Error',
      text2: mensaje,
      position: 'top',
    });
  } else {
    Alert.alert(context ?? 'Error', mensaje);
  }
}
