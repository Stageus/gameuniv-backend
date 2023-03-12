const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const pgPool = require('../module/pgPool');

router.post('/', loginAuth, async (req ,res) => {
    //from FE
    const score = req.body.score || 0;

    //to FE
    const result = {};
    let statusCode = 200;

    //validaion check
    if(score < 0){
        statusCode = 400;
        result.message = 'invalid score';
    }

    //main
    if(statusCode === 200){
        const pgClient = pgPool.connect();
        try{
            await pgClient.query('BEGIN');

            // 여기서부터 개발 ================================
        }catch(err){
            console.log(err);
        }finally{

        }
    }
});

module.exports = router;