const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const pgPool = require('../module/pgPool');
const scoreCoint = require('../module/scoreCoin');
const achieve = require('../module/achieve');


router.post('/', loginAuth, async (req, res) => {
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

            //achieve list
            const achieveList = await achieve(loginUserEmail, score, 'tetris');

            //COMMIT
            await pgClient.query('COMMIT');

            //SELECT rank
            const selectRankSql = `SELECT 
                                        RANK() OVER ( ORDER BY MAX(game_score) DESC) AS rank
                                    FROM
                                        game_2048_record_tb
                                    GROUP BY
                                        user_email
                                    `;
            const selectRankResult = await pgPool.query(selectRankSql);
            result.data.rank = parseInt(selectRankResult.rows[0].rank);
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
})

module.exports = router;