const verifyToken = require('../module/verifyToken');

module.exports = (req, res, next) => {
  //from FE
  const token = req.cookies.token || '';

  //main
  const verifiedResult = verifyToken(token);

  if (verifiedResult.state) {
    req.user = verifiedResult.data;
    next();
  } else {
    res.status(401).send({ message: '로그인을 해야합니다.' });
  }
};
