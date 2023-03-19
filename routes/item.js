const router = require('express').Router();
const loginAuth = require('../middleware/loginAuth');
const pgPool = require('../module/pgPool');
const verifyToken = require('../module/verifyToken');

router.get('/all', async (req, res) => {
    //from FE
    const token = req.cookies?.token;
    const loginUserEmail = verifyToken(token)?.data?.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        //SELECT item
        const selectItemSql = `SELECT 
                                    item_idx, 
                                    item_name, 
                                    preview_img, 
                                    detail_img, 
                                    item_price,
                                    condition_achieve
                ${
                    loginUserEmail ? `, (
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
                                    ` : ``
                }
                                FROM 
                                    item_tb
                                `;

        const selectItemResult = await pgPool.query(selectItemSql, loginUserEmail ? [loginUserEmail] : []);
        result.data = selectItemResult.rows
    }catch(err){
        console.log(err);

        result.message = 'unexpected error occrued';
        statusCode = 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/buy/all', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.user.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        //SELECT item
        const selectItemSql = 'SELECT item_owner_tb.item_idx, item_name, preview_img, detail_img, item_price FROM item_owner_tb JOIN item_tb ON item_tb.item_idx = item_owner_tb.item_idx WHERE item_owner_tb.user_email = $1';
        const selectItemResult = await pgPool.query(selectItemSql, [loginUserEmail]);

        result.data = selectItemResult.rows;
    }catch(err){
        console.log(err);

        result.message = 'unexpected error occured';
        statusCode = 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.get('/pick/all', loginAuth, async (req, res) => {
    //from FE
    const loginUserEmail = req.user.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //main
    try{
        //SELECT item
        const selectItemSql = 'SELECT item_pick_tb.item_idx, item_name, preview_img, detail_img, item_price FROM item_pick_tb JOIN item_tb ON item_tb.item_idx = item_pick_tb.item_idx WHERE item_pick_tb.user_email = $1';
        const selectItemResult = await pgPool.query(selectItemSql, [loginUserEmail]);

        result.data = selectItemResult.rows;
    }catch(err){
        console.log(err);

        result.message = 'unexpected error occured';
        statusCode = 409;
    }

    //send result
    res.status(statusCode).send(result);
});

router.post('/buy', loginAuth, async (req, res) => {
    //from FE
    const itemIdx = req.body.itemIdx || -1;
    const loginUserEmail = req.user.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //validation check
    if(itemIdx < 0){
        statusCode = 400;
        result.message = 'invalid item idx';
    }

    //main
    if(statusCode === 200){
        try{
            //SELECT
            const selectItemSql = `SELECT 
                                        (item_price <= (SELECT coin FROM user_tb WHERE email = $2)) as purchasable_state,
                                        condition_achieve,
                                        user_achieve_tb.user_email,
                                        item_price,
                                        (SELECT item_owner_idx FROM item_owner_tb WHERE item_idx = $1 AND user_email = $2) IS NOT NULL AS own_state
                                    FROM
                                        item_tb
                                    LEFT JOIN
                                        user_achieve_tb
                                    ON
                                        condition_achieve = user_achieve_tb.achieve_idx
                                    WHERE
                                        item_idx = $1
                                    `;
            const selectItemResult = await pgPool.query(selectItemSql, [itemIdx, loginUserEmail]);

            if(selectItemResult.rows.length > 0){
                if(selectItemResult.rows[0].own_state === false){
                    if(selectItemResult.rows[0].purchasable_state){
                        if(selectItemResult.rows[0].condition_achieve !== null && selectItemResult.rows[0].user_email === null){
                            statusCode = 403;
                            result.noAuthReason = 'lock';
                            result.message = 'no achievement has been achieved';
                        }else{
                            const pgClient = await pgPool.connect();
    
                            //BEGIN
                            await pgClient.query('BEGIN');
    
                            //UPDATE
                            const updateCoinSql = 'UPDATE user_tb SET coin = coin - $1 WHERE email = $2';
                            await pgClient.query(updateCoinSql, [selectItemResult.rows[0].item_price, loginUserEmail]);
    
                            //INSERT
                            const insertCointSql = 'INSERT INTO item_owner_tb (item_idx, user_email) VALUES ($1, $2)';
                            await pgClient.query(insertCointSql, [itemIdx, loginUserEmail]);
    
                            //COMMIT
                            await pgClient.query('COMMIT');
    
                            await pgClient.end();
                        }
                    }else{
                        statusCode = 403;
                        result.noAuthReason = 'coin';
                        result.message = 'not enough coins';
                    }
                }else{
                    statusCode = 403;
                    result.message = 'already exists';
                }
            }else{
                statusCode = 404;
                result.message = 'cannot find item';
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

router.post('/pick', loginAuth, async (req, res) => {
    //from FE
    const inputItemIdx = req.body.itemIdx || -1;
    const loginUserEmail = req.user.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //validaion check
    if(inputItemIdx < 0){
        statusCode = 400;
        result.message = 'invalid item idx';
    }

    //main
    if(statusCode === 200){
        try{
            //INSERT
            const insertPickSql = 'INSERT INTO item_pick_tb (user_email, item_idx) VALUES ($1, $2)';
            await pgPool.query(insertPickSql, [loginUserEmail, inputItemIdx]);
        }catch(err){
            console.log(err);

            if(err.code === '23505'){
                statusCode = 403;
                result.message = 'already picked item';
            }else if(err.code === '23503'){
                statusCode = 404;
                result.message = 'cannot find item idx';
            }else{
                statusCode = 409;
                result.message = 'unexpected error occured';
            }
        }
    }

    //send result
    res.status(statusCode).send(result);
});

router.delete('/pick', loginAuth, async (req, res) => {
    //from FE
    const inputItemIdx = req.query['item-idx'] || -1;
    const loginUserEmail = req.user.email;

    //to FE
    const result = {};
    let statusCode = 200;

    //validaion check
    if(inputItemIdx < 0){
        result.message = 'invalid item idx';
        statusCode = 400;
    }

    //main
    if(statusCode === 200){
        try{
            //DELETE
            const deletePickSql = 'DELETE FROM item_pick_tb WHERE user_email = $1 AND item_idx = $2';
            const deletePickResult = await pgPool.query(deletePickSql, [loginUserEmail, inputItemIdx]);

            if(deletePickResult.rowCount === 0){
                statusCode = 403;
                result.message = 'have not already picked item';
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