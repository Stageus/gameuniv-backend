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
const wrapper = require('../module/wrapper');
const {
  ServerErrorException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} = require('../module/Exception');

// 로그인 사용자 정보 가져오기
router.get(
  '/user',
  loginAuth,
  wrapper(async (req, res) => {
    const loginUser = req.user;

    const selectUserResult = await pgPool.query(
      `SELECT 
        user_name, 
        email, 
        profile_img, 
        university_name 
      FROM 
        user_tb 
      JOIN 
        university_tb 
      ON 
        university_tb.university_idx = user_tb.university_idx 
      WHERE 
        email = $1`,
      [loginUser.email]
    );
    const user = selectUserResult.rows[0];

    if (!user) {
      res.clearCookie('token');
      throw new ServerErrorException('사용자를 찾을 수 없습니다.');
    }

    res.status(200).send({
      data: {
        user_name: user.user_name,
        email: user.email,
        profileImg: user.profile_img,
        universityName: user.university_name,
      },
    });
  })
);

// 로그인하기
router.post(
  '/',
  wrapper(async (req, res) => {
    const inputId = req.body.id;
    const inputPw = req.body.pw;
    const autoLogin = req.body.autoLogin;

    const selectUserResult = await pgPool.query(
      `SELECT 
          email, 
          id, 
          profile_img AS "profileImg",
          user_name AS name, 
          university_name AS "universityName", 
          authority,
          block_state AS "blockState",
          is_delete AS "isDelete"
      FROM 
          user_tb 
      JOIN
          university_tb 
      ON 
          user_tb.university_idx = university_tb.university_idx 
      WHERE 
          id = $1 
      AND 
          pw = $2`,
      [inputId, pwHash(inputPw)]
    );
    const user = selectUserResult.rows[0];

    if (!user) {
      throw new BadRequestException('아이디 또는 패스워드가 잘못되었습니다.');
    }

    if (user.isDelete) {
      throw new BadRequestException('아이디 또는 패스워드가 잘못되었습니다.');
    }

    if (user.blockState) {
      throw new ForbiddenException('정지된 계정입니다.');
    }

    const token = makeToken(
      {
        email: user.email,
        id: user.id,
        profileImg: user.profileImg,
        name: user.name,
        universityName: user.universityName,
        authority: user.authority,
      },
      autoLogin ? '48h' : '1h'
    );

    res.cookie('token', token, cookieConfig);

    res.status(200).send({});
  })
);

// 이메일 인증번호 확인하기
router.get(
  '/email/number',
  wrapper(async (req, res) => {
    const email = req.query.email;
    const inputAuthNumber = req.query.number;

    const authNumber = await redis.get(`${email}-auth-number`);

    if (!authNumber) {
      throw new ForbiddenException('인증 번호가 발송되지 않았습니다.');
    }

    if (authNumber !== inputAuthNumber) {
      throw new BadRequestException('인증번호가 잘못되었습니다.');
    }

    await redis.set(`certified-${email}`, 1);
    await redis.expire(`certified-${email}`, 60 * 30);

    res.status(200).send({});
  })
);

// 이메일 인증번호 발송하기
router.post(
  '/email/number',
  wrapper(async (req, res) => {
    const email = req.body.email;
    const universityName = req.body.universityName;

    if (!userEmailRegExp.test(email)) {
      throw new BadRequestException('이메일이 유효하지 않습니다.');
    }
    if (!universityName || universityName.length > 32) {
      throw new BadRequestException('대학이름이 유효하지 않습니다.');
    }

    const selectUserResult = await pgPool.query(
      `SELECT 
        block_state AS "blockState"
      FROM 
        user_tb 
      WHERE 
        email = $1`,
      [email]
    );
    const user = selectUserResult.rows[0];

    if (user?.blockState) {
      throw new ForbiddenException('계정이 정지되었습니다.');
    }

    const selectUniResult = await pgPool.query(
      `SELECT 
        university_address_name AS "universityAddressName"
      FROM 
        university_tb 
      JOIN 
        university_address_tb 
      ON 
        university_tb.university_idx = university_address_tb.university_idx 
      WHERE 
        university_name = $1`,
      [universityName]
    );
    const allowEmailDomains = selectUniResult.rows.map((row) => row.universityAddressName);

    if (!allowEmailDomains.includes(email.split('@')[1])) {
      throw new NotFoundException('이메일 주소가 학교 이메일 주소와 다릅니다.');
    }

    const randomNumber = makeRandomNumber(6);

    await redis.set(`${email}-auth-number`, randomNumber);
    await redis.expire(`${email}-auth-number`, 60 * 3);

    await sendEmail(email, randomNumber);

    res.status(200).send({});
  })
);

// 로그아웃하기
router.delete('/', loginAuth, (req, res) => {
  res.clearCookie('token');
  res.status(200).send({});
});

module.exports = router;
