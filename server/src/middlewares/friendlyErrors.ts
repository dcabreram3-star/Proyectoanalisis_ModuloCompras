import { Request, Response, NextFunction } from 'express';
import { traducirErrorOracle } from '../utils/oracleErrors.js';

export function friendlyErrorResponses(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = ((body: any) => {
    if (res.statusCode >= 400 && body && typeof body === 'object') {
      for (const key of ['message', 'error']) {
        if (typeof body[key] !== 'string') continue;
        const friendly = traducirErrorOracle(body[key]);
        if (!friendly) continue;

        console.error('[DB Error traducido]:', body[key]);
        body.message = friendly.message;
        body.error = friendly.message;
        body.codigo = friendly.code;
        body.campo = friendly.field;
        res.status(friendly.status);
        break;
      }
    }
    return originalJson(body);
  }) as Response['json'];

  next();
}