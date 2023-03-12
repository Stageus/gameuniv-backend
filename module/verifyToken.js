const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (token) => {
    try{
        const verifiedData = jwt.verify(token, process.env.JWT_SECRET_KEY);

        return {
            state : true,
            data : verifiedData
        }
    }catch(err){
        return {
            state : false
        }
    }
}