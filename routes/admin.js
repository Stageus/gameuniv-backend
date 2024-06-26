const router = require('express').Router();
const mongodb = require('mongodb').MongoClient;
const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const path = require('path');
const pgPool = require('../module/pgPool');

router.use(express.static(path.join(__dirname, '../admin')));

router.get('/', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'html', 'index.html'));
});

router.get('/user/all', adminAuth, async (req, res) => {
  //from FE
  const offset = req.query.offset || 0;
  const searchType = req.query['search-type'];
  const search = req.query.search;

  //to FE
  const result = {};
  let statusCode = 200;

  //main
  try {
    //SELECT
    const selectUserSql = `SELECT
                                    email,
                                    id,
                                    profile_img,
                                    user_name,
                                    university_name,
                                    is_delete,
                                    coin,
                                    game_2048_count,
                                    game_tetris_count,
                                    block_state
                                FROM
                                    user_tb
                                JOIN
                                    university_tb
                                ON
                                    university_tb.university_idx = user_tb.university_idx
                                ORDER BY
                                    user_tb.creation_time DESC
                                LIMIT 
                                    10
                                OFFSET
                                    $1 * 10
                                `;
    const selectUserResult = await pgPool.query(selectUserSql, [offset]);

    result.data = selectUserResult.rows;
  } catch (err) {
    console.log(err);
  }

  //send result
  res.status(statusCode).send(result);
});

router.get('/log/all', adminAuth, async (req, res) => {
  //from FE
  const offset = req.query.offset || 0;
  const limit = parseInt(req.query.limit) || 100;
  const searchEmail = req.query.email;
  const searchMethodd = req.query.method;
  const searchPath = req.query.path;
  const searchStatusCode = req.query.code;

  //to FE
  const result = {};
  let statusCode = 200;

  //main
  try {
    const DB = await mongodb.connect('mongodb://localhost:27017');
    const logCol = DB.db('gameuniv').collection('log');

    const mongoQuery = {};
    if (searchEmail) {
      mongoQuery.req_user_email = searchEmail;
    }
    if (searchMethodd) {
      mongoQuery.method = searchMethodd.toUpperCase();
    }
    if (searchPath) {
      mongoQuery.api_path = {
        $regex: searchPath,
      };
    }
    if (searchStatusCode) {
      mongoQuery.status_code = parseInt(searchStatusCode);
    }

    const logFindResult = await logCol
      .find(mongoQuery)
      .limit(limit)
      .sort({
        req_time: -1,
      })
      .skip(offset * limit)
      .toArray();

    result.data = logFindResult;

    DB.close();
  } catch (err) {
    console.log(err);

    statusCode = 409;
    result.message = '예상하지 못한 에러가 발생했습니다.';
  }

  //send result
  res.status(statusCode).send(result);
});

module.exports = router;
