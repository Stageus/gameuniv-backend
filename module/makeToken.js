const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (data, expireIn = '1h') => {
    const token = jwt.sign(
        data,
        process.env.JWT_SECRET_KEY,
        {
            expiresIn : '24h',
            issuer : 'gameuniv'
        }
    );

    return token;
}