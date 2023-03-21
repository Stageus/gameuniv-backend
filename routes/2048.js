const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const pgPool = require('../module/pgPool');
const scoreCoint = require('../module/scoreCoin');
const achieve = require('../module/achieve');
const redis = require('../module/redisClient');
const insertRankScore = require('../module/insertRankScore');

router.get('/record/all', async (req, res) => {
    //from FE
    const offset = req.query.offset || 0;
    const today = new Date();
    today.setHours(today.getHours() + 9);
    const tableName = `game_2048_${today.getFullYear()}${today.getMonth()}_rank_tb`;

    //to FE
    const result = {};
    let statusCode = 200;

    //validaion check
    if(offset < 0){
        statusCode = 400;
        result.message = 'invalid offset';
    }

    //main
    if(statusCode === 200){
        try{
            const selectRankSql = `SELECT 
                                        CAST(RANK() OVER ( ORDER BY game_score DESC) AS int) AS rank,
                                        game_score AS max_score,
                                        id,
                                        profile_img,
                                        university_name
                                    FROM
                                        ${tableName}
                                    JOIN
                                        user_tb
                                    ON
                                        user_email = email
                                    JOIN
                                        university_tb
                                    ON
                                        user_tb.university_idx = university_tb.university_idx
                                    WHERE
                                        user_tb.is_delete IS NULL
                                    LIMIT
                                        100
                                    OFFSET
                                        $1 * 100
                                    `;
            const selectRankResult = await pgPool.query(selectRankSql, [offset]);

            result.data = selectRankResult.rows;
        }catch(err){
            console.log(err);

            result.message = 'unexpected error occured';
            statusCode = 409;
        }
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/record/:email', loginAuth, async (req, res) => {
    //from FE
    const userEmail = req.params.email;
    const today = new Date();
    today.setHours(today.getHours() + 9);
    const tableName = `game_2048_${today.getFullYear()}${today.getMonth()}_rank_tb`;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        const selectRankSql = `SELECT
                                    rank,
                                    game_score AS max_score
                                FROM
                                    (
                                        SELECT 
                                            CAST(RANK() OVER ( ORDER BY game_score DESC) AS int) AS rank,
                                            game_score,
                                            user_email
                                        FROM
                                            ${tableName}
                                        JOIN
                                            user_tb
                                        ON
                                            user_email = email
                                        WHERE
                                            user_tb.is_delete IS NULL
                                    ) AS rank_tb
                                WHERE
                                    user_email = $1
                                `;
        const selectRankResult = await pgPool.query(selectRankSql, [userEmail]);

        result.data = selectRankResult.rows[0] || {
            rank : -2
        };
    }catch(err){
        console.log(err);

        result.message = 'unexpected error occured';
        statusCode = 409;
    }
    
    //send result
    res.status(statusCode).send(result);
});

router.post('/score', loginAuth, async (req ,res) => {
    //from FE
    const score = req.body.score || 0;
    const loginUserEmail = req.user.email;
    const coin = scoreCoint(score);

    //to FE
    const result = { data : { achieveList : [] } };
    let statusCode = 200;

    //validaion check
    if(score < 0){
        statusCode = 400;
        result.message = 'invalid score';
    }
    try{
        const curScore = await redis.get(`2048_score_${loginUserEmail}`);
        await redis.del(`2048_score_${loginUserEmail}`);

        if(curScore != score){
            statusCode = 403;
            result.message = 'score error';
        }
    }catch(err){
        console.log(err);

        statusCode = 409;
        result.message = 'unexpected error occured';
    }

    //main
    if(statusCode === 200){
        const pgClient = await pgPool.connect();
        try{
            //BEGIN
            await pgClient.query('BEGIN');

            //INSERT score
            const insert2048RecordSql = 'INSERT INTO game_2048_record_tb (user_email, game_score) VALUES ($1, $2)';
            await pgClient.query(insert2048RecordSql, [loginUserEmail, score]);

            //UPDATE coin
            const updateCoinSql = 'UPDATE user_tb SET coin = coin + $1, game_2048_count = game_2048_count + 1 WHERE email = $2';
            await pgClient.query(updateCoinSql, [coin, loginUserEmail]);

            //COMMIT
            await pgClient.query('COMMIT');

            //insert rank data
            await insertRankScore(score, loginUserEmail, '2048');

            //achieve list
            const achieveList = await achieve(loginUserEmail, score, '2048');

            //SELECT rank
            const selectRankSql = `SELECT 
                                        RANK() OVER ( ORDER BY MAX(game_score) DESC) AS rank
                                    FROM
                                        game_2048_record_tb
                                    WHERE
                                        EXTRACT(MONTH FROM creation_time) = EXTRACT(MONTH FROM NOW())
                                    AND
                                        EXTRACT(YEAR FROM creation_time) = EXTRACT(YEAR FROM NOW())
                                    AND
                                        (
                                            SELECT
                                                is_delete
                                            FROM
                                                user_tb
                                            WHERE
                                                game_2048_record_tb.user_email = user_tb.email
                                        ) IS NULL
                                    GROUP BY
                                        user_email
                                    HAVING
                                        MAX(game_score) >= $1
                                    LIMIT
                                        101
                                    `;
            const selectRankResult = await pgPool.query(selectRankSql, [score]);
            result.data.rank = parseInt(selectRankResult.rows.length || 0) + 1;
            if(result.data.rank >= 101){
                result.data.rank = -1;
            }
            result.data.coin = coin;

            //insert achieve
            for(const achieveData of achieveList){
                try{
                    const achieveIdx = achieveData.achieveIdx;

                    //INSERT INTO
                    const insertAchSql = 'INSERT INTO user_achieve_tb (user_email, achieve_idx) VALUES ($1, $2)';
                    await pgClient.query(insertAchSql, [loginUserEmail, achieveIdx]);

                    //SELECT reward coin
                    const selectRewardCoinSql = 'SELECT achieve_reward_coin AS reward_coin, achieve_reward_img AS reward_img, achieve_name FROM achieve_tb WHERE achieve_idx = $1';
                    const selectRewardCoinResult = await pgClient.query(selectRewardCoinSql, [achieveIdx]);

                    result.data.achieveList.push({
                        ...selectRewardCoinResult.rows[0]
                    });

                    //UPDATE coin
                    const updateCoinSql = 'UPDATE user_tb SET coin = coin + $1 WHERE email = $2';
                    await pgClient.query(updateCoinSql, [selectRewardCoinResult.rows[0].reward_coin, loginUserEmail]);
                }catch(err){
                    console.log(err);
                }
            }
        }catch(err){
            console.log(err);
            
            await pgClient.query('ROLLBACK');

            delete result.data;
            result.status = 409;
            result.message = 'unexpected error occured';
        }finally{
            await pgClient.release();
        }
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/score/rank', loginAuth, async (req, res) => {
    //from FE
    const score = parseInt(req.query.score) || 0;
    const loginUserEmail = req.user.email;
    const today = new Date();
    today.setHours(today.getHours() + 9);
    const tableName = `game_2048_${today.getFullYear()}${today.getMonth()}_rank_tb`;

    //to FE
    const result = {};
    let statusCode = 200;

    //validation check
    if(score < 0){
        statusCode = 400;
        result.message = 'invalid score';
    }

    //main
    if(statusCode === 200){
        try{
            //SELECT pre
            const selectPreSql = `SELECT 
                                        CAST(RANK() OVER ( ORDER BY game_score DESC) AS int) AS pre_rank,
                                        game_score pre_max_score,
                                        university_name AS pre_university_name,
                                        id AS pre_id
                                    FROM
                                        ${tableName}
                                    JOIN
                                        user_tb
                                    ON
                                        user_email = email
                                    JOIN
                                        university_tb
                                    ON
                                        university_tb.university_idx = user_tb.university_idx
                                    WHERE
                                        game_score > $1 
                                    AND
                                        user_tb.is_delete IS NULL
                                    ORDER BY
                                        pre_rank DESC
                                    LIMIT
                                        1
                                    `;
            const selectPreResult = await pgPool.query(selectPreSql, [score]);
            const userRank = selectPreResult.rows?.[0]?.pre_rank ? parseInt(selectPreResult.rows[0].pre_rank) + 1 : 1;

            //SELECT rank
            const selectNextSql = `SELECT 
                                        rank + 1 AS next_rank,
                                        game_score AS next_max_score,
                                        university_name AS next_university_name,
                                        id AS next_id
                                    FROM 
                                        (
                                            SELECT 
                                                CAST(RANK() OVER ( ORDER BY game_score DESC) AS int) AS rank,
                                                game_score,
                                                user_email,
                                                university_name,
                                                id
                                            FROM
                                                ${tableName}
                                            JOIN
                                                user_tb
                                            ON
                                                user_email = email
                                            JOIN
                                                university_tb
                                            ON
                                                university_tb.university_idx = user_tb.university_idx
                                            WHERE
                                                user_tb.is_delete IS NULL
                                            AND
                                                game_score != 0
                                            ORDER BY
                                                rank ASC
                                        ) AS temp_tb   
                                    WHERE
                                        rank > $1
                                    LIMIT
                                        1
                                    `;
            const selectNextResult = await pgPool.query(selectNextSql, [userRank]);

            result.data = {
                ...selectPreResult.rows[0],
                ...selectNextResult.rows[0],
                rank : userRank 
            };

            await redis.set(`2048_score_${loginUserEmail}`, score);
            await redis.expire(`2048_score_${loginUserEmail}`, 60 * 30);
        }catch(err){
            if(err.code === '42P01'){
                result.data = {
                    rank : 1
                }
            }else{
                console.log(err);

                statusCode = 409;
                result.message = 'unexpected error occured';
            }
        }
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;