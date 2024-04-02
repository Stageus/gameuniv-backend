const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
  windowMs: 2 * 1000,
  max: 100,
  handler(req, res) {
    res.status(423).send({
      message: 'too many request',
    });
  },
});
