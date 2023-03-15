const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const pgPool = require('../module/pgPool');
const scoreCoint = require('../module/scoreCoin');
const achieve = require('../module/achieve');

router.get('/record/all', loginAuth, async (req, res) => {
    //from FE
    const offset = req.query.offset || 0;

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
            //SELECT rank
            const selectRankSql = `SELECT  
                                        rank_tb.max_score AS max_score,
                                        user_tb.id AS id,
                                        profile_img AS profile_img,
                                        university_name
                                    FROM
                                        (
                                            SELECT
                                                MAX(game_score) AS max_score,
                                                user_email AS user_email
                                            FROM
                                                game_tetris_record_tb
                                            WHERE
                                                EXTRACT(MONTH FROM game_tetris_record_tb.creation_time) = EXTRACT(MONTH FROM NOW())
                                            AND
                                                EXTRACT(YEAR FROM game_tetris_record_tb.creation_time) = EXTRACT(YEAR FROM NOW())
                                            AND
                                                (
                                                    SELECT 
                                                        is_delete 
                                                    FROM 
                                                        user_tb 
                                                    WHERE 
                                                        email = game_tetris_record_tb.user_email 
                                                ) IS NULL
                                            GROUP BY
                                                user_email
                                            LIMIT
                                                100
                                            OFFSET
                                                $1
                                        ) AS rank_tb
                                    JOIN
                                        user_tb
                                    ON
                                        user_tb.email = rank_tb.user_email
                                    JOIN
                                        university_tb
                                    ON
                                        user_tb.university_idx = university_tb.university_idx
                                    ORDER BY
                                        max_score DESC
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

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        const selectRankSql = `SELECT 
                                    rank,
                                    max_score
                                FROM
                                    (
                                        SELECT 
                                            RANK() OVER ( ORDER BY MAX(game_score) DESC) AS rank,
                                            MAX(game_score) AS max_score,
                                            user_email AS user_email
                                        FROM
                                            game_tetris_record_tb
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
                                                    email = game_tetris_record_tb.user_email
                                            ) IS NULL
                                        GROUP BY
                                            user_email
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

router.post('/score', loginAuth, async (req, res) => {
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

    //main
    if(statusCode === 200){
        const pgClient = await pgPool.connect();
        try{
            //BEGIN
            await pgClient.query('BEGIN');

            //INSERT score
            const inserttetrisRecordSql = 'INSERT INTO game_tetris_record_tb (user_email, game_score) VALUES ($1, $2)';
            await pgClient.query(inserttetrisRecordSql, [loginUserEmail, score]);

            //UPDATE coin
            const updateCoinSql = 'UPDATE user_tb SET coin = coin + $1, game_tetris_count = game_tetris_count + 1 WHERE email = $2';
            await pgClient.query(updateCoinSql, [coin, loginUserEmail]);

            //COMMIT
            await pgClient.query('COMMIT');

            //achieve list
            const achieveList = await achieve(loginUserEmail, score, 'tetris');

            //SELECT rank
            const selectRankSql = `SELECT
                                        RANK() OVER ( ORDER BY MAX(game_score) DESC) AS rank
                                    FROM
                                        game_tetris_record_tb
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
                                                game_tetris_record_tb.user_email = user_tb.email
                                        ) IS NULL
                                    GROUP BY
                                        user_email
                                    HAVING
                                        MAX(game_score) > $1
                                    LIMIT
                                        101
                                    `;
            const selectRankResult = await pgPool.query(selectRankSql, [score]);
            result.data.rank = parseInt(selectRankResult.rows?.[0]?.rank || 0) + 1;
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
    
    //to FE
    const result = {};
    let statusCode = 200;

    //validation check
    if(score <= 0){
        statusCode = 400;
        result.message = 'invalid score';
    }

    //main
    if(statusCode === 200){
        try{
            //SELECT
            const selectPreSql = `SELECT
                                        MAX(id) AS pre_id,
                                        MAX(university_name) AS pre_university_name,
                                        MAX(game_score) AS pre_max_score
                                    FROM
                                        game_tetris_record_tb
                                    JOIN
                                        user_tb
                                    ON
                                        user_email = user_tb.email
                                    JOIN
                                        university_tb
                                    ON
                                        user_tb.university_idx = university_tb.university_idx
                                    WHERE
                                        EXTRACT(MONTH FROM game_tetris_record_tb.creation_time) = EXTRACT(MONTH FROM NOW())
                                    AND
                                        EXTRACT(YEAR FROM game_tetris_record_tb.creation_time) = EXTRACT(YEAR FROM NOW())
                                    AND
                                        user_tb.is_delete IS NULL
                                    GROUP BY
                                        user_email
                                    HAVING
                                        MAX(game_score) < $1
                                    ORDER BY
                                        MAX(game_score) DESC
                                    LIMIT
                                        1
                                    `;
            const selectPreResult = await pgPool.query(selectPreSql, [score]);

            //SELECT
            const selectNextSql = `SELECT
                                        MAX(id) AS next_id,
                                        MAX(university_name) AS next_university_name,
                                        MAX(game_score) AS next_max_score
                                    FROM
                                        game_tetris_record_tb
                                    JOIN
                                        user_tb
                                    ON
                                        user_email = user_tb.email
                                    JOIN
                                        university_tb
                                    ON
                                        user_tb.university_idx = university_tb.university_idx
                                    WHERE
                                        EXTRACT(MONTH FROM game_tetris_record_tb.creation_time) = EXTRACT(MONTH FROM NOW())
                                    AND
                                        EXTRACT(YEAR FROM game_tetris_record_tb.creation_time) = EXTRACT(YEAR FROM NOW())
                                    AND
                                        user_tb.is_delete IS NULL
                                    GROUP BY
                                        user_email
                                    HAVING
                                        MAX(game_score) > $1
                                    ORDER BY
                                        MAX(game_score) ASC
                                    LIMIT
                                        1
                                    `;
            const selectNextResult = await pgPool.query(selectNextSql, [score]);

            //SELECT rank
            const selectRankSql = `SELECT 
                                        RANK() OVER ( ORDER BY MAX(game_score) DESC) AS rank
                                    FROM
                                        game_tetris_record_tb
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
                                                game_tetris_record_tb.user_email = user_tb.email
                                        ) IS NULL
                                    GROUP BY
                                        user_email
                                    HAVING
                                        MAX(game_score) >= $1
                                    LIMIT
                                        101
                                    `;
            const selectRankResult = await pgPool.query(selectRankSql, [score]);

            result.data = {
                ...selectPreResult.rows?.[0],
                ...selectNextResult.rows?.[0],
                rank : parseInt(selectRankResult.rows.length || 0) + 1
            }
            if(result.data > 100){
                result.data = -1;
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