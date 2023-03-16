const addLog = require('../module/addLog');

module.exports = () => {
    return (req, res ,next) => {
        const oldSend = res.send;
        req.date = new Date();
        res.send = (result)=>{
            if(typeof(result) === 'string' && req.originalUrl.split('/')[1] !== 'log'){
                addLog(req,res,result);
            }else if(typeof(result) === 'string' && req.originalUrl.split('/')[1] === 'log'){
                addLog(req,res,"hidden");
            }
            return oldSend.apply(res, [result]);
        }
        
        next();
    }
}