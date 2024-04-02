const fs = require('fs');
require('dotenv').config();

module.exports = () => {
  return {
    ca: fs.readFileSync(process.env.SSL_CA_FILE_PATH),
    key: fs.readFileSync(process.env.SSL_KEY_FILE_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_FILE_PATH),
  };
};
