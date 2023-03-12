const crypto = require('crypto');

module.exports = (password) => {
    return crypto.createHmac('sha256', process.env.PASSWORD_SECRET).update(password).digest('hex');
}