const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser')

const authApi = require('./routes/auth');
const userApi = require('./routes/user');
const game2048Api = require('./routes/2048');
const itemApi = require('./routes/item');

//setting
dotenv.config();

//middleware
app.use(express.json());
app.use(cookieParser());

//routes
app.use('/auth', authApi);
app.use('/user', userApi);
app.use('/2048', game2048Api);
app.use('/item', itemApi);

//listening
app.listen(process.env.HTTP_PORT, '0.0.0.0', () => {
    console.log(`server on port : ${process.env.HTTP_PORT}`);
});