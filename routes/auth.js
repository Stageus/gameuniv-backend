const router = require('express').Router();
const makeRandomNumber = require('../module/makeRandomNumber');
const pgPool = require('../module/pgPool');
const { userEmailRegExp } = require('../module/regExp');
const sendEmail = require('../module/sendEmail');
const redis = require('redis').createClient();
const pwHash = require('../module/pwHash');
const makeToken = require('../module/makeToken');
const cookieConfig = require('../config/cookieConfig');
const loginAuth = require('../middleware/loginAuth');

router.get('/user', loginAuth, (req, res) => {
    //to FE
    const result = {};
    let statusCode = 200;

    //main
    result.data = {
        id : req.user.id,
        email : req.user.email,
        profileImg : req.user.profileImg,
        universityName : req.user.universityName
    }

    //send result
    res.status(statusCode).send(result);
});

router.post('/', async (req, res) => {
    //from FE
    const inputId = req.body.id;
    const inputPw = req.body.pw;
    const autoLogin = req.body.autoLogin;

    console.log(inputId, inputPw, autoLogin);
    
    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        const selectUserSql = 'SELECT email, id, profile_img, user_name, university_name, authority FROM user_tb JOIN university_tb ON user_tb.university_idx = university_tb.university_idx WHERE id = $1 AND pw = $2 AND is_delete IS NULL';
        const selectUserResult = await pgPool.query(selectUserSql, [inputId, pwHash(inputPw)]);

        if(selectUserResult.rows.length !== 0){
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
            await redis.connect();
    
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
    
            await redis.disconnect();
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
            //const selectUserSql = 'SELECT email FROM user_tb WHERE email = $1';
            //const selectUserResult = await pgPool.query(selectUserSql, [email]);

            const selectUniSql = 'SELECT university_address_name FROM university_tb JOIN university_address_tb ON university_tb.university_idx = university_address_tb.university_idx WHERE university_name = $1';
            const selectUniResult = await pgPool.query(selectUniSql, [universityName]);
    
            if(selectUniResult.rows.map(data => data.university_address_name).includes(email.split('@')[1])){
                await redis.connect();
                
                const randomNumber = makeRandomNumber(6);

                await redis.set(`${email}-auth-number`, randomNumber);
                await redis.expire(`${email}-auth-number`, 60 * 3);

                await sendEmail(email, randomNumber);

                await redis.disconnect();
            }else{
                statusCode = 403;
                result.message = 'invalid email domain';
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