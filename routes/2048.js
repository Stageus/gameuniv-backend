const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const pgPool = require('../module/pgPool');
const scoreCoint = require('../module/scoreCoin');
const achieve = require('../module/achieve');

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

            //achieve list
            const achieveList = await achieve(loginUserEmail, score, '2048');

            //COMMIT
            await pgClient.query('COMMIT');

            //SELECT rank
            const selectRankSql = `SELECT 
                                        RANK() OVER ( ORDER BY MAX(game_score) DESC) AS rank
                                    FROM
                                        game_2048_record_tb
                                    WHERE
                                        game_score > $1
                                    GROUP BY
                                        user_email
                                    `;
            const selectRankResult = await pgPool.query(selectRankSql, [score]);
            result.data.rank = parseInt(selectRankResult.rows?.[0]?.rank || 0) + 1;
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
                                        game_2048_record_tb
                                    JOIN
                                        user_tb
                                    ON
                                        user_email = user_tb.email
                                    JOIN
                                        university_tb
                                    ON
                                        user_tb.university_idx = university_tb.university_idx
                                    GROUP BY
                                        user_email
                                    HAVING
                                        MAX(game_score) < $1
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
                                        game_2048_record_tb
                                    JOIN
                                        user_tb
                                    ON
                                        user_email = user_tb.email
                                    JOIN
                                        university_tb
                                    ON
                                        user_tb.university_idx = university_tb.university_idx
                                    GROUP BY
                                        user_email
                                    HAVING
                                        MAX(game_score) > $1
                                    LIMIT
                                        1
                                    `;
            const selectNextResult = await pgPool.query(selectNextSql, [score]);

            //SELECT rank
            const selectRankSql = `SELECT 
                                        RANK() OVER ( ORDER BY MAX(game_score) DESC) AS rank
                                    FROM
                                        game_2048_record_tb
                                    GROUP BY
                                        user_email
                                    HAVING
                                        MAX(game_score) > $1
                                    `;
            const selectRankResult = await pgPool.query(selectRankSql, [score]);

            result.data = {
                ...selectPreResult.rows?.[0],
                ...selectNextResult.rows?.[0],
                rank : parseInt(selectRankResult.rows?.[0]?.rank || 0) + 1
            }

            console.log(selectRankResult.rows);
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