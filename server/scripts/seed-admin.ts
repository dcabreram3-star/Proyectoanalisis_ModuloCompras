import 'dotenv/config';
import { initOraclePool, closeOraclePool, getConnection } from '../src/config/database.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { clavePermitida } from '@erp/contracts';

async function main() {
  const username = 'admin';
  const rawPassword = 'Analisis2026*';
  const nombre = 'Administrador del Sistema';
  const rol = 'ADMIN';

  if (!clavePermitida(rawPassword, username)) {
    throw new Error('La contraseña no cumple con la política de seguridad institucional.');
  }

  const passwordHash = await hashPassword(rawPassword);

  await initOraclePool();
  const conn = await getConnection();
  try {
    // Verificar si el usuario ya existe
    const res = await conn.execute<any>(
      `SELECT ID_USUARIO FROM SEG_USUARIOS WHERE UPPER(USERNAME) = UPPER(:u)`,
      { u: username }
    );

    if (res.rows && res.rows.length > 0) {
      await conn.execute(
        `UPDATE SEG_USUARIOS 
            SET PASSWORD_HASH = :h,
                INTENTOS_FALLIDOS = 0,
                BLOQUEADO_HASTA = NULL,
                DEBE_CAMBIAR_CLAVE = 'N',
                ESTADO = 'ACTIVO',
                FECHA_CLAVE = SYSTIMESTAMP
          WHERE UPPER(USERNAME) = UPPER(:u)`,
        { h: passwordHash, u: username }
      );
      await conn.commit();
      console.log(`[seed-admin] Usuario '${username}' actualizado exitosamente con la clave institucional.`);
    } else {
      await conn.execute(
        `INSERT INTO SEG_USUARIOS (
           USERNAME, NOMBRE, PASSWORD_HASH, ROL, ESTADO, INTENTOS_FALLIDOS, DEBE_CAMBIAR_CLAVE
         ) VALUES (
           :u, :nombre, :h, :rol, 'ACTIVO', 0, 'N'
         )`,
        { u: username, nombre, h: passwordHash, rol }
      );
      await conn.commit();
      console.log(`[seed-admin] Usuario '${username}' creado exitosamente con la clave institucional.`);
    }
  } finally {
    await conn.close();
    await closeOraclePool();
  }
}

main().catch((err) => {
  console.error('[seed-admin] Error al inicializar/actualizar usuario admin:', err);
  process.exit(1);
});
