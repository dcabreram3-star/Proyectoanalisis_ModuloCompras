import { Response } from 'express';
import { traducirErrorOracle } from '../utils/oracleErrors.js';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  codigo?: string;
  campo?: string;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  const responseBody: ApiResponse<T> = {
    success: true,
    ...(message ? { message } : {}),
    data,
  };
  res.status(statusCode).json(responseBody);
}

export function sendError(
  res: Response,
  message: string,
  error?: unknown,
  statusCode: number = 400
): void {
  const detalle = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
  const friendly = traducirErrorOracle(detalle);

  if (friendly) {
    console.error(`[DB Error traducido] ${message}:`, detalle);
    const body: ApiResponse = {
      success: false,
      message: friendly.message,
      error: friendly.message,
      codigo: friendly.code,
      campo: friendly.field,
    };
    res.status(friendly.status).json(body);
    return;
  }

  const responseBody: ApiResponse = {
    success: false,
    message,
    ...(detalle ? { error: detalle } : {}),
  };
  res.status(statusCode).json(responseBody);
}