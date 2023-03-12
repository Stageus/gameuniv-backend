const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const pgPool = require('../module/pgPool');

router.post('/pick', loginAuth, async (req, res) => {
    //from FE
    const inputItemIdx = req.body.itemIdx || -1;
    const loginUserEmail = req.user.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //validaion check
    if(inputItemIdx < 0){
        statusCode = 400;
        result.message = 'invalid item idx';
    }

    //main
    if(statusCode === 200){
        try{
            //INSERT
            const insertPickSql = 'INSERT INTO pick_item_tb (user_email, item_idx) VALUES ($1, $2)';
            await pgPool.query(insertPickSql, [loginUserEmail, inputItemIdx]);
        }catch(err){
            console.log(err);

            if(err.code === '23505'){
                statusCode = 403;
                result.message = 'already picked item';
            }else if(err.code === '23503'){
                statusCode = 404;
                result.message = 'cannot find item idx';
            }else{
                statusCode = 409;
                result.message = 'unexpected error occured';
            }
        }
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;