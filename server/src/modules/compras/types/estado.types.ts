// Tipos usados internamente por el módulo de Estados en el servidor

// Forma en la que llega la fila directo de Oracle (columnas en mayúsculas)
export interface Estado {
  EST_ID_ESTADO: number;
  EST_NOMBRE_ESTADO: string;
}

// Forma en la que recibimos los datos desde el body de una petición (crear/editar)
export interface EstadoInput {
  nombreEstado: string;
}
