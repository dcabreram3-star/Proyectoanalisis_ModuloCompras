export interface IEstado {
  estIdEstado: number;
  estNombreEstado: string;
  estActivo?: number;
}

export interface ICreateEstadoDTO {
  estNombreEstado: string;
  estActivo?: number;
}

export interface IUpdateEstadoDTO {
  estNombreEstado?: string;
  estActivo?: number;
}

export interface IEstadoFilterParams {
  nombre?: string;
  activo?: number;
}
