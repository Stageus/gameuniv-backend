const router = require('express').Router();
const profileUpload = require('../middleware/profileUpload');
const redis = require('redis').createClient();
const { userNameRegExp, userEmailRegExp, userPwRegExp, userIdRegExp } = require('../module/regExp');
const pwHash = require('../module/pwHash');
const pgPool = require('../module/pgPool');
const loginAuth = require('../middleware/loginAuth');
const sendEmail = require('../module/sendEmail');

router.get('/id/duplication', async (req ,res) => {
    //from FE
    const inputId = req.query.id || '';

    //to FE
    const result = {};
    let statusCode = 200;

    //validaion check
    console.log(userIdRegExp.test(inputId));
    if(!userIdRegExp.test(inputId)){
        result.message = 'invalid id';
        statusCode = 400;
    }

    //main
    if(statusCode === 200){
        try{
            const selectIdSql = 'SELECT id FROM user_tb WHERE id = $1';
            const selectIdResult = await pgPool.query(selectIdSql, [inputId]);

            if(selectIdResult.rows.length !== 0){
                statusCode = 403;
                result.message = 'id already exists';
            }
        }catch(err){
            console.log(err);
            
            statusCode = 409;
            result.message = 'unexpected error occured';
        }
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/coin', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.user.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        const selectCoinSql = 'SELECT coin FROM user_tb WHERE email = $1';
        const selectCoinResult = await pgPool.query(selectCoinSql, [loginUserEmail]);

        result.data = selectCoinResult.rows[0];
    }catch(err){
        console.log(err);

        result.message = 'unexpected error occured';
        statusCode = 409;
    }

    //send result
    res.status(statusCode).send(result);
}); 

router.post('/', profileUpload, async (req, res) => {
    //from FE
    const inputEmail = req.body.email;
    const inputId = req.body.id;
    const inputName = req.body.name;
    const inputPw = req.body.pw;
    const inputPwCheck = req.body.pwCheck;
    const universityIdx = req.body.universityIdx;
    const profileImg = req?.file?.key || null;
    const defaultImg = req.body.defaultImg || null;

    //to FE
    const result = {};
    let statusCode = 200;

    //validation check
    if(!userEmailRegExp.test(inputEmail)){
        result.message = 'invalid email';
        statusCode = 400;
    }else if(!userIdRegExp.test(inputId)){
        console.log(userIdRegExp.test(inputId));
        result.message = 'invalid id';
        statusCode = 400;
    }else if(!userNameRegExp.test(inputName)){
        result.message = 'invalid name';
        statusCode = 400;
    }else if(!userPwRegExp.test(inputPw)){
        result.message = 'invalid pw';
        statusCode = 400;
    }else if(inputPw !==  inputPwCheck){
        result.message = 'wrong pw check';
        statusCode = 400;
    }

    //main
    try{
        //email auth check
        await redis.connect();

        const authState = await redis.get(`certified-${req.body.email}`);

        if(authState){
            //SELECT
            const selectUserSql = 'SELECT email FROM user_tb WHERE email = $1 AND is_delete IS NOT NULL';
            const selectUserResult = await pgPool.query(selectUserSql, [inputEmail]);

            if(selectUserResult.rows.length !== 0){
                //UPDATE
                const updateUserSql = 'UPDATE user_tb SET is_delete = NULL, user_name = $2, pw = $3 WHERE email = $1 RETURNING id';
                const updateUserResult =  await pgPool.query(updateUserSql, [inputEmail, inputName, pwHash(inputPw)]);

                result.id = updateUserResult.rows[0].id;
            }else{
                //INSERT
                const insertUserSql = `INSERT INTO
                                        user_tb
                                            (email, id, pw, profile_img, user_name, university_idx)
                                        VALUES
                                            ( $1, $2, $3, $4, $5, $6 )
                                    `;
                await pgPool.query(insertUserSql, [inputEmail, inputId, pwHash(inputPw), profileImg || defaultImg, inputName, universityIdx]);
            }

            await redis.del(`certified-${req.body.email}`);
        }else{
            statusCode = 403;
            result.message = 'no email auth';
        }   

        await redis.disconnect();
    }catch(err){
        console.log(err);
        
        result.err = err;

        if(err.code === '23502'){
            statusCode = 400;
            result.message = 'invalid university idx';
        }else{
            statusCode = 409;
            result.message = 'unexpected error occured';
        }
    }finally{
        if(redis.isOpen){
            await redis.disconnect();
        }
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/id', async (req, res) => {
    //from FE
    const inputEmail = req.query.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //validation check
    if(!userEmailRegExp.test(inputEmail)){
        statusCode = 400;
        result.message = 'invalid id';
    }

    //main
    if(statusCode === 200){
        try{
            //SELECT
            const selectIdSql = 'SELECT id FROM user_tb WHERE email = $1 AND is_delete IS NULL';
            const selectIdResult = await pgPool.query(selectIdSql, [inputEmail]);

            if(selectIdResult.rows.length !== 0){
                await sendEmail(inputEmail, selectIdResult.rows[0].id, '아이디 찾기');
            }else{
                statusCode = 401;
                result.message = 'cannot find user with email';
            }
        }catch(err){
            console.log(err);

            statusCode = 409;
            result.message = 'unexpected error occured';
        }
    }

    //send result
    res.status(statusCode).send(result);
});

router.post('/profile-img', loginAuth, profileUpload, async (req, res) => {
    //from FE
    const profileImg = req?.file?.key || null;
    const defaultImg = req.body.defaultImg || null;

    console.log(profileImg, defaultImg);

    //to FE
    const result = {};
    let statusCode = 200;

    //validaion check
    if(profileImg === null && defaultImg === null){
        statusCode = 400;
        result.message = 'no image';
    }

    //main
    if(statusCode === 200){
        try{
            const updateUserSql = 'UPDATE user_tb SET profile_img = $1 WHERE email = $2';
            await pgPool.query(updateUserSql, [profileImg || defaultImg, req.user.email]);
        }catch(err){    
            console.log(err);
    
            statusCode = 409;
            result.message = 'unexpected error occured';
        }
    }

    //send result 
    res.status(statusCode).send(result);
});

router.put('/pw', async (req, res) => {
    //from FE
    const inputEmail = req.body.email;
    const inputPw = req.body.pw;
    const inputPwCheck = req.body.pwCheck;

    //to FE
    const result = {};
    let statusCode = 200;

    //validation check
    if(!userPwRegExp.test(inputPw)){
        result.message = 'invalid pw';
        statusCode = 400;
    }

    //main
    if(statusCode === 200){
        try{
            //SELECT
            const selectEmailSql = 'SELECT email FROM user_tb WHERE email = $1';
            const selectEmailResult = await pgPool.query(selectEmailSql, [inputEmail]);

            if(selectEmailResult.rows.length !== 0){
                await redis.connect();

                const authState = await redis.get(`certified-${inputEmail}`);

                if(authState){
                    //UPDATE
                    const updatePwSql = 'UPDATE user_tb SET pw = $1 WHERE email = $2';
                    await pgPool.query(updatePwSql, [pwHash(inputPw), inputEmail]);

                    await redis.del(`certified-${inputEmail}`);
                }else{
                    statusCode = 403;
                    result.message = 'no certified email';
                }

                await redis.disconnect();
            }else{
                statusCode = 401;
                result.message = 'email does not exist';
            }
        }catch(err){
            console.log(err);

            if(redis.isOpen){
                await redis.disconnect();
            }
    
            result.message = 'unexpected error occured';
            statusCode = 409;
        }
    }

    //send result 
    res.status(statusCode).send(result);
});

router.delete('/:email', loginAuth, async (req, res) => {
    //to FE
    const inputEmail = req.params.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //authority check
    if(req.user.authority !== 1 && req.user.email !== inputEmail){
        statusCode = 403;
        result.message = 'no auth';
    }
    
    //main
    if(statusCode === 200){
        try{
            //UPDATE
            const updateUserSql = 'UPDATE user_tb SET is_delete = CURRENT_TIMESTAMP WHERE email = $1 AND is_delete IS NULL';
            const updateUserResult = await pgPool.query(updateUserSql, [inputEmail]);

            if(!updateUserResult.rowCount){
                statusCode = 404;
                result.message = 'cannot find email';
            }
            if(req.user.email === inputEmail){
                res.clearCookie('token');
            }
        }catch(err){
            console.log(err);

            statusCode = 409;
            result.message = 'unexpected error occured';
        }
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;