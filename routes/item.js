const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} = require('../module/Exception');
const pgPool = require('../module/pgPool');
const verifyToken = require('../module/verifyToken');
const wrapper = require('../module/wrapper');

router.get('/all', async (req, res) => {
  //from FE
  const token = req.cookies?.token;
  const loginUserEmail = verifyToken(token)?.data?.email;

  //to FE
  const result = {};
  let statusCode = 200;

  //main
  try {
    //SELECT item
    const selectItemSql = `SELECT 
                                    item_idx, 
                                    item_name, 
                                    preview_img, 
                                    detail_img, 
                                    item_price,
                                    condition_achieve
                ${
                  loginUserEmail
                    ? `, (
                                            SELECT 
                                                item_owner_idx 
                                            FROM 
                                                item_owner_tb 
                                            WHERE 
                                                item_owner_tb.item_idx = item_tb.item_idx 
                                            AND 
                                                user_email = $1
                                        ) IS NOT NULL 
                                        AS 
                                            item_bought_state,
                                        (
                                            SELECT
                                                item_pick_idx
                                            FROM 
                                                item_pick_tb
                                            WHERE
                                                item_pick_tb.item_idx = item_tb.item_idx
                                            AND
                                                user_email =$1
                                        ) IS NOT NULL
                                        AS 
                                            item_picked_state,
                                        (
                                            CASE 
                                                WHEN 
                                                    item_tb.condition_achieve IS NOT NULL   
                                                THEN
                                                    (
                                                        SELECT
                                                            user_achieve_idx
                                                        FROM
                                                            user_achieve_tb
                                                        WHERE
                                                            user_email = $1 
                                                        AND
                                                            user_achieve_tb.achieve_idx = item_tb.condition_achieve
                                                    ) IS NOT NULL
                                                ELSE
                                                    null
                                            END
                                        ) AS unlock_state
                                    `
                    : ``
                }
                                FROM 
                                    item_tb
                                ORDER BY
                                    unlock_state DESC
                                `;
    const selectItemResult = await pgPool.query(
      selectItemSql,
      loginUserEmail ? [loginUserEmail] : []
    );
    result.data = selectItemResult.rows;
  } catch (err) {
    console.log(err);

    result.message = '예상하지 못한 에러가 발생했습니다.';
    statusCode = 409;
  }

  //send result
  res.status(statusCode).send(result);
});

// 구매한 아이템 모두 가져오기
router.get(
  '/buy/all',
  loginAuth,
  wrapper(async (req, res) => {
    const loginUser = req.user;

    const selectItemResult = await pgPool.query(
      `SELECT 
        item_owner_tb.item_idx, 
        item_name, 
        preview_img, 
        detail_img, 
        item_price 
      FROM 
        item_owner_tb 
      JOIN 
        item_tb 
      ON 
        item_tb.item_idx = item_owner_tb.item_idx 
      WHERE 
        item_owner_tb.user_email = $1`,
      [loginUser.email]
    );
    const items = selectItemResult.rows;

    res.status(200).send({
      data: items,
    });
  })
);

// 찜한 아이템 모두 가져오기
router.get(
  '/pick/all',
  loginAuth,
  wrapper(async (req, res) => {
    const loginUser = req.user;

    const selectItemResult = await pgPool.query(
      `SELECT 
        item_pick_tb.item_idx, 
        item_name, 
        preview_img, 
        detail_img, 
        item_price 
      FROM 
        item_pick_tb 
      JOIN 
        item_tb 
      ON 
        item_tb.item_idx = item_pick_tb.item_idx 
      WHERE 
        item_pick_tb.user_email = $1 
      ORDER BY 
        item_pick_tb.creation_time ASC`,
      [loginUser.email]
    );
    const items = selectItemResult.rows;

    res.status(200).send({
      data: items,
    });
  })
);

// 아이템 구매하기
router.post(
  '/buy',
  loginAuth,
  wrapper(async (req, res) => {
    const itemIdx = req.body.itemIdx || -1;
    const loginUser = req.user;

    if (itemIdx < 0) {
      throw new BadRequestException('해당 아이템은 존재하지 않습니다.');
    }

    const selectItemResult = await pgPool.query(
      `SELECT 
          (item_price <= (SELECT coin FROM user_tb WHERE email = $2)) as "purchasableState",
          condition_achieve AS "conditionAchieve",
          user_achieve_tb.user_email AS "userEmail",
          item_price AS price,
          available_state as "avaliableState",
          (SELECT item_owner_idx FROM item_owner_tb WHERE item_idx = $1 AND user_email = $2) IS NOT NULL AS "ownState"
      FROM
          item_tb
      LEFT JOIN
          user_achieve_tb
      ON
          condition_achieve = user_achieve_tb.achieve_idx
      WHERE
          item_idx = $1`,
      [itemIdx, loginUser.email]
    );
    const item = selectItemResult.rows[0];

    if (!item) {
      throw new NotFoundException('아이템을 찾을 수 없습니다.');
    }

    if (!item.avaliableState) {
      throw new ForbiddenException('준비중인 아이템입니다. 지금은 구매할 수 없습니다.');
    }

    if (item.ownState) {
      throw new ForbiddenException('이미 가지고 있는 아이템입니다.');
    }

    if (!item.purchasableState) {
      throw new ForbiddenException('코인이 충분하지 않습니다.');
    }

    if (item.condition_achieve !== null && item.user_email === null) {
      throw new NotFoundException({
        message: '업적을 달성해야만 구매가능한 아이템입니다.',
        noAuthReason: 'lock',
      });
    }

    const pgClient = await pgPool.connect();
    try {
      await pgClient.query('BEGIN');

      await pgClient.query('UPDATE user_tb SET coin = coin - $1 WHERE email = $2', [
        item.price,
        loginUser.email,
      ]);

      await pgClient.query('INSERT INTO item_owner_tb (item_idx, user_email) VALUES ($1, $2)', [
        itemIdx,
        loginUser.email,
      ]);

      await pgClient.query('COMMIT');

      await pgClient.end();
    } catch (err) {
      await pgClient.query('ROLLBACK');
    } finally {
      pgClient.release();
    }

    res.status(200).send({});
  })
);

// 아이템 찜하기
router.post('/pick', loginAuth, async (req, res) => {
  const inputItemIdx = req.body.itemIdx || -1;
  const loginUser = req.user;

  if (inputItemIdx < 0) {
    throw new BadRequestException('해당 아이템은 존재하지 않습니다.');
  }

  try {
    await pgPool.query('INSERT INTO item_pick_tb (user_email, item_idx) VALUES ($1, $2)', [
      loginUser.email,
      inputItemIdx,
    ]);
  } catch (err) {
    if (err.code === '23505') throw new ForbiddenException('이미 찜한 아이템입니다.');

    if (err.code === '23503') throw new NotFoundException('해당 아이템은 존재하지 않습니다.');

    throw err;
  }

  res.status(statusCode).send({});
});

router.delete('/pick', loginAuth, async (req, res) => {
  //from FE
  const inputItemIdx = req.query['item-idx'] || -1;
  const loginUserEmail = req.user.email;

  //to FE
  const result = {};
  let statusCode = 200;

  //validaion check
  if (inputItemIdx < 0) {
    result.message = '해당 아이템은 존재하지 않습니다.';
    statusCode = 400;
  }

  //main
  if (statusCode === 200) {
    try {
      //DELETE
      const deletePickSql = 'DELETE FROM item_pick_tb WHERE user_email = $1 AND item_idx = $2';
      const deletePickResult = await pgPool.query(deletePickSql, [loginUserEmail, inputItemIdx]);

      if (deletePickResult.rowCount === 0) {
        statusCode = 403;
        result.message = '이미 찜을 하지 않았습니다.';
      }
    } catch (err) {
      console.log(err);

      statusCode = 409;
      result.message = '예상하지 못한 에러가 발생했습니다.';
    }
  }

  //send result
  res.status(statusCode).send(result);
});

module.exports = router;
