/*
 * Crea las tablas y carga los datos iniciales.
 * Uso:  npm run init-db
 * (La base de datos indicada en .env debe existir; si no existe se intenta crear.)
 */
import fs from "fs";
import path from "path";
import pkg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();
const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_BD = path.join(__dirname, "..", "..", "database");
const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false;

async function crearBaseSiNoExiste() {
    if (process.env.DATABASE_URL) return;
    const admin = new Client({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
                               password: process.env.DB_PASSWORD, database: "postgres", ssl });
    await admin.connect();
    const r = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [process.env.DB_NAME]);
    if (!r.rowCount) {
        await admin.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
        console.log(`Base de datos "${process.env.DB_NAME}" creada.`);
    }
    await admin.end();
}

async function main() {
    await crearBaseSiNoExiste();
    const cliente = process.env.DATABASE_URL
        ? new Client({ connectionString: process.env.DATABASE_URL, ssl })
        : new Client({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
                       password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl });
    await cliente.connect();
    console.log("Creando tablas...");
    await cliente.query(fs.readFileSync(path.join(DIR_BD, "schema.sql"), "utf8"));
    console.log("Cargando datos iniciales...");
    await cliente.query(fs.readFileSync(path.join(DIR_BD, "seed.sql"), "utf8"));
    const r = await cliente.query(`SELECT (SELECT COUNT(*) FROM pacientes) p, (SELECT COUNT(*) FROM citas) c, (SELECT COUNT(*) FROM facturas) f`);
    console.log(`Listo: ${r.rows[0].p} pacientes, ${r.rows[0].c} citas, ${r.rows[0].f} facturas.`);
    console.log("Usuario administrador: admin@dermavida.do  /  Admin123*");
    await cliente.end();
}

main().catch((e) => {
    console.error("Error inicializando la base de datos:", e.message);
    process.exit(1);
});
