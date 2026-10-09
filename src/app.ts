import "dotenv/config";
import { pool } from "./conf/dbConnection";
import { Server } from "./server";

async function main(): Promise<void> {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log("Conexión a MySQL exitosa");
    new Server().listen();
  } catch (error) {
    console.error("No se pudo conectar a la base de datos");
    process.exit(1);
  }
}

main();