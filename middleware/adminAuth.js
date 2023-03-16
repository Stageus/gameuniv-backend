const verifyToken = require('../module/verifyToken');

module.exports = (req, res, next) => {
    //from FE
    const token = req.cookies.token || '';
    
    //main
    const verifiedResult = verifyToken(token);

    if(verifiedResult.state){
        if(verifiedResult.data.authority == 1){
            req.user = verifiedResult.data;
            next();
        }else{
            res.status(403).send({ message : 'no admin auth' });
        }
    }else{
        res.status(401).send({ message : 'no login' });
    }
}