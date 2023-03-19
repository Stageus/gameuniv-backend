const express = require('express');
const app = express();
const https = require('https');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const logging = require('./middleware/logging');
const rateLimit = require('./middleware/rateLimit');

const authApi = require('./routes/auth');
const userApi = require('./routes/user');
const game2048Api = require('./routes/2048');
const itemApi = require('./routes/item');
const universityApi = require('./routes/university');
const achieveApi = require('./routes/achieve');
const tetrisApi = require('./routes/tetris');
const blockApi = require('./routes/block');
const adminApi = require('./routes/admin');

//setting
dotenv.config();
const options = { 
    ca: fs.readFileSync('/etc/letsencrypt/live/gameuniv.site/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/gameuniv.site/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/gameuniv.site/cert.pem')
};

//middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'gameuniv-react', 'build')));
app.use(logging());
app.use(rateLimit);
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
app.use('/block', blockApi);
app.use('/admin', adminApi);

//serve FILE
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'gameuniv-react', 'build', 'index.html')); 
});

//listening
app.listen(process.env.HTTP_PORT, '0.0.0.0', () => {
    console.log(`server on port : ${process.env.HTTP_PORT}`);
});

https.createServer(options, app).listen(process.env.HTTPS_PORT, '0.0.0.0', () => {
    console.log(`server on port : ${process.env.HTTPS_PORT}`);
});