const pgPool = require('./pgPool');
const makeScoreTable = require('./makeScoreTable');

module.exports = (score, loginUserEmail, gameType = '2048') => {
    if(score <= 0){
        return 0;
    }
    return new Promise(async (resolve, reject) => { 
        const today = new Date();
        today.setHours(today.getHours() + 9);
        const month = today.getMonth();
        const year = today.getFullYear();
        const tableName = `game_${gameType}_${year}${month}_rank_tb`;

        //SELECT table existence
        const selectTableSql = `SELECT COUNT(*) AS count FROM pg_tables WHERE tablename = $1`;
        const selectTableResult = await pgPool.query(selectTableSql, [tableName]);

        try{
            if(selectTableResult.rows[0].count === '0'){
                await makeScoreTable(year, month, gameType);
            }

            //SELECT game score
            const selectMyScoreSql = `SELECT game_score FROM ${tableName} WHERE user_email = $1`;
            const selectMyScoreResult = await pgPool.query(selectMyScoreSql, [loginUserEmail]);
            
            //max score check
            if(selectMyScoreResult.rows.length === 0){
                //INSERT
                const insertScoreSql = `INSERT INTO ${tableName} (user_email, game_score) VALUES ($1, $2)`;
                await pgPool.query(insertScoreSql, [loginUserEmail, score]);
            }else if(selectMyScoreResult.rows[0].game_score < score){
                //UDPATE
                const deleteScoreSql = `UPDATE ${tableName} SET game_score = $2 WHERE user_email = $1`;
                await pgPool.query(deleteScoreSql, [loginUserEmail, score]);
            }

            resolve(1);
        }catch(err){
            reject(err);
        }
    });
}