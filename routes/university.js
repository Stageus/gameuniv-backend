const router = require('express').Router();
const pgPool = require('../module/pgPool');

router.get('/all', async (req, res) => {
  //to FE
  const result = {};
  let statusCode = 200;

  //main
  try {
    //SELECT
    const selectUnivSql = 'SELECT university_idx, university_name FROM university_tb LIMIT 500';
    const selectUnivResult = await pgPool.query(selectUnivSql);

    result.data = selectUnivResult.rows;
  } catch (err) {
    console.log(err);

    result.message = '예상하지 못한 에러가 발생했습니다.';
    statusCode = 409;
  }

  //send result
  res.status(statusCode).send(result);
});

module.exports = router;
