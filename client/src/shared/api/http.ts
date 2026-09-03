// Cliente HTTP básico para consumir la API del backend.
// Todo el módulo de compras (y los demás cuando se agreguen) usan esto.

const API_BASE_URL = 'http://localhost:3000/api';

async function manejarRespuesta(response: Response) {
  if (response.status === 204) {
    return null; // No Content (por ejemplo, después de un DELETE)
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const mensaje = data?.error || 'Ocurrió un error al comunicarse con el servidor';
    throw new Error(mensaje);
  }

  return data;
}

export const api = {
  get: (path: string) =>
    fetch(`${API_BASE_URL}${path}`).then(manejarRespuesta),

  post: (path: string, body: unknown) =>
    fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(manejarRespuesta),

  put: (path: string, body: unknown) =>
    fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(manejarRespuesta),

  delete: (path: string) =>
    fetch(`${API_BASE_URL}${path}`, { method: 'DELETE' }).then(manejarRespuesta),
};
