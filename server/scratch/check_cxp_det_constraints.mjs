import { execute } from '../dist/config/database.js';

async function main() {
  const res = await execute(`
    SELECT TOM_ID_TOMA, TOM_NUMERO_TOMA, TOM_ID_BODEGA, TOM_ESTADO 
    FROM CMP_TOMA_FISICA 
    WHERE TOM_NUMERO_TOMA = 'TOMA-2026-3747' OR TOM_ID_BODEGA = 1
  `);
  console.log('Toma rows for bodega 1:', res.rows);
  process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
