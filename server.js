const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authApi = require('./routes/auth');
const userApi = require('./routes/user');
const game2048Api = require('./routes/2048');
const itemApi = require('./routes/item');
const universityApi = require('./routes/university');
const achieveApi = require('./routes/achieve');
const tetrisApi = require('./routes/tetris');

//setting
dotenv.config();

//middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin : ['http://gameuniv.site', 'http://localhost:3000'],
    credentials : true
}));

//routes
app.use('/auth', authApi);
app.use('/user', userApi);
app.use('/2048', game2048Api);
app.use('/item', itemApi);
app.use('/university', universityApi);
app.use('/achieve', achieveApi);
app.use('/tetris', tetrisApi);

//listening
app.listen(process.env.HTTP_PORT, '0.0.0.0', () => {
    console.log(`server on port : ${process.env.HTTP_PORT}`);
});