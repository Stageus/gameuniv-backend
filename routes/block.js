const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const adminAuth = require('../middleware/adminAuth');
const pgPool = require('../module/pgPool');

router.post('/user', adminAuth, async (req, res) => {
    //from FE
    const blockEmail = req.body.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        //UPDATE
        const udpateUserSql = 'UPDATE user_tb SET is_delete = CURRENT_TIMESTAMP, block_state = CURRENT_TIMESTAMP WHERE email = $1';
        await pgPool.query(udpateUserSql, [blockEmail])
    }catch(err){
        console.log(err);

        result.message = 'unexpected error occured';
        statusCode = 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.delete('/user', adminAuth, async (req, res) => {
    //from FE
    const blockEmail = req.query.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        //UPDATE
        const udpateUserSql = 'UPDATE user_tb SET is_delete = NULL, block_state = NULL WHERE email = $1';
        await pgPool.query(udpateUserSql, [blockEmail])
    }catch(err){
        console.log(err);

        result.message = 'unexpected error occured';
        statusCode = 409;
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;