const { Client } = require('pg');
require('dotenv').config({ path : '../.env' });
const pgConfig = {
    user : process.env.PSQL_USER,
    host : process.env.PSQL_HOST,
    database : process.env.PSQL_DATABASE,
    password : process.env.PSQL_PASSWORD,
    port : process.env.PSQL_PORT
}
const pgClient = new Client({
    ...pgConfig,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

const nowDate = new Date();
nowDate.setHours(nowDate.getHours() + 9);

const nextMonthDate = new Date();
nextMonthDate.setMonth(nowDate.getMonth() + 1);
nextMonthDate.setHours(0 + 9);
nextMonthDate.setMinutes(0);
nextMonthDate.setSeconds(0);
nextMonthDate.setMilliseconds(0);
nextMonthDate.setDate(1);

const timeDiff = nextMonthDate.getTime() - nowDate.getTime();

const timestop = (milliseconds) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(milliseconds);
        }, milliseconds);
    });
}

const callback = async () => {
    const monthFirstDate = new Date();
    monthFirstDate.setHours(0 + 9);
    monthFirstDate.setMinutes(0);
    monthFirstDate.setSeconds(0);
    monthFirstDate.setMilliseconds(0);
    monthFirstDate.setDate(1);

    const monthLastDate = new Date();
    monthLastDate.setMonth(monthLastDate.getMonth() + 1);
    monthLastDate.setDate(monthLastDate.getDate() - 1);
    monthLastDate.setHours(0 + 9);
    monthLastDate.setMinutes(0);
    monthLastDate.setSeconds(0);
    monthLastDate.setMilliseconds(0);
    monthLastDate.setDate(1);

    const timeDiff = monthLastDate.getTime() - monthFirstDate.getTime();

    try{
        await monthFirstFunc();
    }catch(err){
        console.log(err);
    }

    await timestop(2000000000);
    return setTimeout(callback, timeDiff - 2000000000);
}

setTimeout(() => {
    callback();
}, timeDiff);

console.log(timeDiff / 1000 / 60 / 60 / 24);

const monthFirstFunc = () => {
    return new Promise(async (resolve, reject) => {
        try{
            await pgClient.connect();

            const selectTetrisRankSql = `SELECT  
                                            rank_tb.max_score AS max_score,
                                            user_email
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
                                                            user_tb.email = game_tetris_record_tb.user_email
                                                    ) IS NULL
                                                GROUP BY
                                                    user_email
                                                ORDER BY
                                                    MAX(game_score) DESC
                                                LIMIT
                                                    100
                                            ) AS rank_tb
                                        `;
            const selectTetrisRankResult = await pgClient.query(selectTetrisRankSql);

            for(const i in selectTetrisRankResult.rows){
                const userData = selectTetrisRankResult.rows[i];

                //INSERT tetris acheive
                const insertAchSql = 'INSERT INTO user_achieve_tb (user_email, achieve_idx) VALUES ($1, $2)';
                if(i == 0){
                    //1등 일 경우
                    try{
                        await pgClient.query(insertAchSql, [userData.user_email, 10]);
                    }catch(err){
                        console.log(err);
                    }
                }
                if(i <= 5){
                    //2~5등
                    try{
                        await pgClient.query(insertAchSql, [userData.user_email, 9]);
                    }catch(err){

                    }
                }
                if(i <= 10){
                    //6~10등
                    try{
                        await pgClient.query(insertAchSql, [userData.user_email, 8]);
                    }catch(err){

                    }
                }
                if(i <= 100){
                    //10~100등
                    try{
                        await pgClient.query(insertAchSql, [userData.user_email, 7]);
                    }catch(err){

                    }
                }
            }

            const select2048RankSql = `SELECT  
                                            rank_tb.max_score AS max_score,
                                            user_email
                                        FROM
                                            (
                                                SELECT
                                                    MAX(game_score) AS max_score,
                                                    user_email AS user_email
                                                FROM
                                                    game_2048_record_tb
                                                WHERE
                                                    EXTRACT(MONTH FROM game_2048_record_tb.creation_time) = EXTRACT(MONTH FROM NOW())
                                                AND
                                                    EXTRACT(YEAR FROM game_2048_record_tb.creation_time) = EXTRACT(YEAR FROM NOW())
                                                AND
                                                    (
                                                        SELECT
                                                            is_delete
                                                        FROM
                                                            user_tb
                                                        WHERE
                                                            user_tb.email = game_2048_record_tb.user_email
                                                    ) IS NULL
                                                GROUP BY
                                                    user_email
                                                ORDER BY
                                                    MAX(game_score) DESC
                                                LIMIT
                                                    100
                                            ) AS rank_tb
                                        `;
            const select2048RankResult = await pgClient.query(select2048RankSql);

            for(const i in select2048RankResult.rows){
                const userData = select2048RankResult.rows[i];

                //INSERT
                const insertAchSql = 'INSERT INTO user_achieve_tb (user_email, achieve_idx) VALUES ($1, $2)';
                if(i == 0){
                    //1등 일 경우
                    try{
                        await pgClient.query(insertAchSql, [userData.user_email, 20]);
                    }catch(err){

                    }
                }
                if(i <= 5){
                    //2~5등
                    try{
                        await pgClient.query(insertAchSql, [userData.user_email, 19]);
                    }catch(err){

                    }
                }
                if(i <= 10){
                    //6~10등
                    try{
                        await pgClient.query(insertAchSql, [userData.user_email, 18]);
                    }catch(err){
                        
                    }
                }
                if(i <= 100){
                    //10~100등
                    try{
                        await pgClient.query(insertAchSql, [userData.user_email, 17]);
                    }catch(err){

                    }
                }
            }
        }catch(err){
            console.log(err);
        }
    });
}