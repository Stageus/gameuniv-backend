const router = require('express').Router();
const makeRandomNumber = require('../module/makeRandomNumber');
const pgPool = require('../module/pgPool');
const { userEmailRegExp } = require('../module/regExp');
const sendEmail = require('../module/sendEmail');
const redis = require('../module/redisClient');
const pwHash = require('../module/pwHash');
const makeToken = require('../module/makeToken');
const cookieConfig = require('../config/cookieConfig');
const loginAuth = require('../middleware/loginAuth');

router.get('/user', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.user.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        //SELECT user
        const selectUserSql = 'SELECT user_name, email, profile_img, university_name FROM user_tb JOIN university_tb ON university_tb.university_idx = user_tb.university_idx WHERE email = $1';
        const selectUserResult = await pgPool.query(selectUserSql, [loginUserEmail]);

        if(selectUserResult.rows?.[0]){
            result.data = {
                user_name : selectUserResult.rows[0].user_name,
                email : selectUserResult.rows[0].email,
                profileImg : selectUserResult.rows[0].profile_img,
                universityName : selectUserResult.rows[0].university_name
            }
        }else{
            res.clearCookie('token');
        }
    }catch(err){
        console.log(err);
        
        result.data = {
            id : req.user.id,
            email : req.user.email,
            profileImg : req.user.profileImg,
            universityName : req.user.universityName
        }
    }

    //send result
    res.status(statusCode).send(result);
});

router.post('/', async (req, res) => {
    //from FE
    const inputId = req.body.id;
    const inputPw = req.body.pw;
    const autoLogin = req.body.autoLogin;
    
    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        const selectUserSql = `SELECT 
                                    email, 
                                    id, 
                                    profile_img, 
                                    user_name, 
                                    university_name, 
                                    authority,
                                    block_state,
                                    is_delete
                                FROM 
                                    user_tb 
                                JOIN
                                    university_tb 
                                ON 
                                    user_tb.university_idx = university_tb.university_idx 
                                WHERE 
                                    id = $1 
                                AND 
                                    pw = $2
                                `;
        const selectUserResult = await pgPool.query(selectUserSql, [inputId, pwHash(inputPw)]);

        if(selectUserResult.rows[0]?.is_delete === null){
            if(selectUserResult.rows[0].block_state === null){
                const token = makeToken({
                    email : selectUserResult.rows[0].email,
                    id : selectUserResult.rows[0].id,
                    profileImg : selectUserResult.rows[0].profile_img,
                    name : selectUserResult.rows[0].user_name,
                    universityName : selectUserResult.rows[0].university_name,
                    authority : selectUserResult.rows[0].authority
                }, autoLogin ? '48h' : '1h');
    
                res.cookie('token', token, cookieConfig);
            }else{
                statusCode = 403;
                result.message = 'block user';
            }
        }else{
            statusCode = 400;
            result.message = 'invalid id or pw';
        }
    }catch(err){
        console.log(err);

        statusCode = 409;
        result.message = 'unexpected error occured';
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/email/number', async (req, res) => {
    //from FE
    const email = req.query.email;
    const inputAuthNumber = req.query.number;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    if(statusCode === 200){
        try{
            const authNumber = await redis.get(`${email}-auth-number`);
            
            if(!authNumber){
                statusCode = 403;
                result.message = 'no email is being authenticated';
            }else if(authNumber !== inputAuthNumber){
                statusCode = 400;
                result.message = 'wrong number';
            }else{
                await redis.set(`certified-${email}`, 1);
                await redis.expire(`certified-${email}`, 60 * 30);
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

router.post('/email/number', async (req, res) => {
    //from FE
    const email = req.body.email;
    const universityName = req.body.universityName;

    //to FE
    const result = {};
    let statusCode = 200;

    //validaion check
    if(!userEmailRegExp.test(email)){
        statusCode = 400;
        result.message = 'invalid email';
    }
    if(!universityName || universityName.length > 32){
        statusCode = 400;
        result.message = 'invalid university name';
    }

    //main
    if(statusCode === 200){
        try{
            const selectUserSql = 'SELECT block_state FROM user_tb WHERE email = $1';
            const selectUserResult = await pgPool.query(selectUserSql, [email]);

            if(!selectUserResult.rows?.[0]?.block_state){
                const selectUniSql = 'SELECT university_address_name FROM university_tb JOIN university_address_tb ON university_tb.university_idx = university_address_tb.university_idx WHERE university_name = $1';
                const selectUniResult = await pgPool.query(selectUniSql, [universityName]);
        
                if(selectUniResult.rows.map(data => data.university_address_name).includes(email.split('@')[1])){
                    const randomNumber = makeRandomNumber(6);

                    await redis.set(`${email}-auth-number`, randomNumber);
                    await redis.expire(`${email}-auth-number`, 60 * 3);

                    await sendEmail(email, randomNumber);
                }else{
                    statusCode = 404;
                    result.message = 'invalid email domain';
                }
            }else{
                statusCode = 403;
                result.message = 'block user';
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

router.delete('/', loginAuth, (req, res) => {
    res.clearCookie('token');
    res.status(200).send({});
});

module.exports = router;