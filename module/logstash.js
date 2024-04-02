const verifyToken = require('../module/verifyToken');
const axios = require('axios');

module.exports = async (req, res, result) => {
  const user = verifyToken(req.cookies.token).data;
  const fullUrl = req.originalUrl;
  const userAgent = req.get('User-Agent');
  const requestTime = new Date().getTime() - new Date(req.date).getTime();

  const logString = `${req.ip} ${user?.email || '-'} ${req.date} ${fullUrl} ${
    req.method
  } "${userAgent}" ${requestTime} ${res.statusCode} ${req.score || ''} ${
    process.env.LOGSTASH_SECRET
  }`;
  try {
    await axios.post(`http://${process.env.LOGSTASH_IP}:${process.env.LOGSTASH_PORT}`, {
      message: logString,
    });
  } catch (err) {
    console.log(err.message);
  }
};
