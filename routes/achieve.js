const router = require('express').Router();
const pgPool = require('../module/pgPool');

router.get('/all', async (req, res) => {
    //from FE
    const gameType = req.query.game;

    //to FE
    const result = {};
    let statusCode = 200;

    //validaion check
    if(gameType === 'tetris' || gameType === '2048'){
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
                                        achieve_reward_img,
                                        achieve_reward_coin
                                    FROM
                                        achieve_tb
                                    WHERE
                                        game_type = $1
                                `;
            const selectAchResult = await pgPool.query(selectAchSql, [gameType]);

            result.data = selectAchResult.rows;
        }catch(err){
            console.log(err);
    
            result.message = 'unexpected error occured';
            statusCode = 409;
        }
    }

    //send result
    res.status(statusCode).send(result);
});

module.exports = router;