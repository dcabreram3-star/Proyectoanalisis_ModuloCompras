const SIN_CONEXION = 'No se pudo conectar con el servidor. Revise su conexión e intente de nuevo.';

function mensajePorStatus(status: number): string {
  if (status === 400) return 'Los datos enviados no son válidos. Revise el formulario.';
  if (status === 401 || status === 403) return 'No tiene permisos para realizar esta acción.';
  if (status === 404) return 'No se encontró lo que busca. Es posible que haya sido eliminado.';
  if (status === 409) return 'Esta acción entra en conflicto con información que ya existe.';
  if (status === 413) return 'Los datos enviados son demasiado grandes.';
  if (status >= 500) return 'El servidor no está disponible en este momento. Intente de nuevo en unos minutos.';
  return 'No se pudo completar la acción. Intente de nuevo.';
}

/** Envuelve fetch para que las llamadas a /api siempre devuelvan errores legibles. */
export function installFriendlyFetch(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes('/api/')) return originalFetch(input, init);

    try {
      const response = await originalFetch(input, init);
      const esJson = (response.headers.get('content-type') || '').includes('application/json');

      if (!response.ok && !esJson) {
        const msg = mensajePorStatus(response.status);
        return new Response(JSON.stringify({ success: false, message: msg, error: msg }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return response;
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      throw new Error(SIN_CONEXION);
    }
  };
}