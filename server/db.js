const { Pool } = require("pg");

const isLocalDb = (process.env.DATABASE_URL || "").includes("localhost") || (process.env.DATABASE_URL || "").includes("127.0.0.1");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

module.exports = pool;
