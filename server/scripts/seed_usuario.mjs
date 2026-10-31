import { execute, withTransaction } from '../dist/config/database.js';

async function main() {
  console.log('Synchronizing USUARIO table with SEG_USUARIOS accounts...');
  await withTransaction(async (conn) => {
    const existing = await conn.execute(`SELECT USU_ID_USUARIO FROM USUARIO`);
    const existingIds = new Set((existing.rows || []).map((r) => Number(r.USU_ID_USUARIO || r[0])));

    const usersToInsert = [
      { id: 1, nombre: 'Administrador del Sistema', rol: 1, depto: 1 },
      { id: 21, nombre: 'Administrador de Recuperación', rol: 1, depto: 1 },
      { id: 41, nombre: 'José Fernando López Reyes', rol: 2, depto: 2 },
      { id: 42, nombre: 'Ana Lucía Morales López', rol: 2, depto: 1 },
    ];

    for (const u of usersToInsert) {
      if (!existingIds.has(u.id)) {
        await conn.execute(
          `INSERT INTO USUARIO (USU_ID_USUARIO, USU_NOMBRE_COMPLETO, USU_ID_ROL, USU_ID_DEPARTAMENTO, USU_ACTIVO) 
           VALUES (:id, :nombre, :rol, :depto, 1)`,
          { id: u.id, nombre: u.nombre, rol: u.rol, depto: u.depto }
        );
        console.log(`Inserted user ${u.id}: ${u.nombre}`);
      }
    }
  });

  const check = await execute('SELECT * FROM USUARIO ORDER BY USU_ID_USUARIO');
  console.log('Current rows in USUARIO table:', JSON.stringify(check.rows, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error('Error seeding USUARIO table:', err);
  process.exit(1);
});
