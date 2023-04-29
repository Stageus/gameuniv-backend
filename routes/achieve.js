const router = require('express').Router();
const pgPool = require('../module/pgPool');
const loginAuth = require('../middleware/loginAuth');

router.get('/all', loginAuth, async (req, res) => {
    //from FE
    const gameType = req.query.game || '2048';
    const loginUserEmail = req.user.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //validaion check
    if(gameType !== 'tetris' && gameType !== '2048'){
        result.message = 'invalid game type';
        statusCode = 400;
    }

    //main
    if(statusCode === 200){
        try{
            //SELECT achieve
            const selectAchSql = `SELECT 
                                        achieve_idx,
                                        achieve_name, 
                                        achieve_reward_name AS reward_name,
                                        achieve_reward_img AS reward_img,
                                        achieve_reward_coin AS reward_coin,
                                        progress_rate_string AS achieve_progress_name,
                                        (
                                            SELECT
                                                user_achieve_idx
                                            FROM
                                                user_achieve_tb
                                            WHERE
                                                user_email = $2
                                            AND
                                                user_achieve_tb.achieve_idx = achieve_tb.achieve_idx
                                        ) IS NOT NULL AS achieve_state
                                    FROM
                                        achieve_tb
                                    WHERE
                                        game_type = $1
                                    ORDER BY
                                        achieve_idx ASC
                                `;
            const selectAchResult = await pgPool.query(selectAchSql, [gameType, loginUserEmail]);

            //SELECT play count
            const selectPlayCountSql = 'SELECT game_2048_count AS game_2048, game_tetris_count AS game_tetris FROM user_tb WHERE email = $1';
            const selectPlayCountResult = await pgPool.query(selectPlayCountSql, [loginUserEmail]);

            result.game_count = {
                ...selectPlayCountResult.rows[0]
            };

            result.data = selectAchResult.rows;
        }catch(err){
            console.log(err);
    
            result.message = '예상하지 못한 에러가 발생했습니다.';
            statusCode = 409;
        }
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;