const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.query('SELECT 1')
  .then(() => console.log("✅ PostgreSQL connected"))
  .catch((err: Error) => console.error("❌ Database connection error", err));

module.exports = pool;
