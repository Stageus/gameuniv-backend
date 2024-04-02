const pgConfig = require('../config/pgConfig');
const { Pool } = require('pg');

module.exports = new Pool({
  ...pgConfig,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
