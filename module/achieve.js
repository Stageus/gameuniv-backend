const pgPool = require('../module/pgPool');

module.exports = (loginUserEmail, score, gameType = '2048') => {
    return new Promise(async (resolve, reject) => {
        const userAchieveList = [];

        try{
            //SELECT achieve
            const selectAchSql = 'SELECT achieve_tb.achieve_idx FROM achieve_tb WHERE game_type = $1';
            const selectAchResult = await pgPool.query(selectAchSql, [gameType]);

            const achieveList = selectAchResult.rows.map(data => data.achieve_idx);

            //SELECT user achieve
            const selectUserAchSql = 'SELECT user_achieve_tb.achieve_idx FROM user_achieve_tb LEFT JOIN achieve_tb ON user_achieve_tb.achieve_idx = achieve_tb.achieve_idx  WHERE user_email = $1 AND game_type = $2';
            const selectUserAchResult = await pgPool.query(selectUserAchSql, [loginUserEmail, gameType]);

            for(const userAchieve of selectUserAchResult.rows){
                for(const i in achieveList){
                    if(achieveList[i] == userAchieve.achieve_idx){
                        achieveList.splice(i, 1);
                    }
                }
            }

            //SELECT user play count
            const selectPlayCountSql = 'SELECT game_2048_count, game_tetris_count FROM user_tb WHERE email = $1';
            const selectPlayCountResult = await pgPool.query(selectPlayCountSql, [loginUserEmail]);

            const game2048Count = selectPlayCountResult.rows[0].game_2048_count;
            const gameTetrisCount = selectPlayCountResult.rows[0].game_tetris_count;

            if(achieveList.includes(1)){
                //테트리스 1번 플레이
                if(gameTetrisCount >= 1){
                    userAchieveList.push({
                        achieveIdx : 1
                    });
                }
            }
            if(achieveList.includes(2)){
                //테트리스 15번 플레이
                if(gameTetrisCount >= 15){
                    userAchieveList.push({
                        achieveIdx : 2
                    });
                }
            }
            if(achieveList.includes(3)){
                //테트리스 50번 플레이
                if(gameTetrisCount >= 50){
                    userAchieveList.push({
                        achieveIdx : 3
                    });
                }
            }
            if(achieveList.includes(4)){
                //테트리스 5000점 달성
                if(gameType === 'tetris' && score >= 5000){
                    userAchieveList.push({
                        achieveIdx : 4
                    });
                }
            }
            if(achieveList.includes(5)){
                //테트리스 10000점 달성
                if(gameType === 'tetris' && score >= 10000){
                    userAchieveList.push({
                        achieveIdx : 5
                    });
                }
            }
            if(achieveList.includes(6)){
                //테트리스 25000점 달성
                if(gameType === 'tetris' && score >= 25000){
                    userAchieveList.push({
                        achieveIdx : 6
                    });
                }
            }
            if(achieveList.includes(11)){
                //2048 1번 플레이
                if(game2048Count >= 1){
                    userAchieveList.push({
                        achieveIdx : 11
                    });
                }
            }
            if(achieveList.includes(12)){
                //2048 15번 플레이
                if(game2048Count >= 15){
                    userAchieveList.push({
                        achieveIdx : 12
                    });
                }
            }
            if(achieveList.includes(13)){
                //2048 50번 플레이
                if(game2048Count >= 50){
                    userAchieveList.push({
                        achieveIdx : 13
                    });
                }
            }
            if(achieveList.includes(14)){
                //2048 5000점 달성
                if(gameType === '2048' && score >= 5000){
                    userAchieveList.push({
                        achieveIdx : 14
                    });
                }
            }
            if(achieveList.includes(15)){
                //2048 10000점 달성   
                if(gameType === '2048' && score >= 10000){
                    userAchieveList.push({
                        achieveIdx : 15
                    });
                }
            }
            if(achieveList.includes(16)){
                //2048 25000점 달성
                if(gameType === '2048' && score >= 25000){
                    userAchieveList.push({
                        achieveIdx : 16
                    });
                }
            }

            resolve(userAchieveList);
        }catch(err){
            console.log(err);
            
            reject({
                message : "unexpected error occured"
            });
        }
    })
}