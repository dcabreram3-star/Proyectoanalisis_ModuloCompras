import { Request, Response, NextFunction } from 'express';
import { traducirErrorOracle } from '../utils/oracleErrors.js';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  let status = 500;
  let message = 'Ocurrió un error inesperado en el servidor. Intente de nuevo; si continúa, contacte a soporte.';

  const friendly = traducirErrorOracle(err);
  if (friendly) {
    status = friendly.status;
    message = friendly.message;
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Los datos enviados no tienen un formato válido.';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'Los datos enviados son demasiado grandes.';
  }

  res.status(status).json({ success: false, message, error: message });
}