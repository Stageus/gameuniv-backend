const pgPool = require('./pgPool');

module.exports = (years, month, gameType = '2048') => {
    return new Promise(async (resolve, reject) => {
        if(gameType != '2048' && gameType !== 'tetris'){
            reject({
                err : 'invalid tetris'
            })
        }else{
            try{
                const createTableSql = `CREATE TABLE
                                            game_${gameType}_${years}${month}_rank_tb
                                        (
                                            rank_idx SERIAL NOT NULL,
                                            user_email varchar(320) not null,
                                            game_score int not null,
                                            creation_time TIMESTAMP not null default CURRENT_TIMESTAMP
                                        )
                                        `;
               await pgPool.query(createTableSql);

               await pgPool.query(`CREATE INDEX game_${gameType}_${years}${month}_index ON game_${gameType}_${years}${month}_rank_tb (game_score)`);
    
               resolve(1);
            }catch(err){
                reject(err);
            }
        }
    });
}