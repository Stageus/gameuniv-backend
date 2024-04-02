const mongoClient = require('../module/mongoClient');
const verifyToken = require('../module/verifyToken');
const url = require('url');
const logstash = require('../module/logstash');

module.exports = (req, res, result) => {
  return new Promise(async (resolve, reject) => {
    const urlObj = url.parse(req.originalUrl);
    logstash(req, res, result);

    try {
      await mongoClient
        .db('gameuniv')
        .collection('log')
        .insertOne({
          ip: req.ip, // user ip
          req_user_email: verifyToken(req.cookies.token)?.data?.email || '', // user email
          method: req.method, // req method
          api_path: urlObj.pathname, // api path
          querystring: urlObj.query, // req query
          body: req.body, // req body
          req_time: req.date || null, // req time
          res_time: new Date(), // res time
          status_code: res.statusCode || 409, // status code
          result: JSON.stringify(result || {}), // result obj
        });

      resolve(1);
    } catch (err) {
      console.log(err);
    }
  });
};
