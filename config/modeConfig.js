require('dotenv').config();

const MODE = {
  PRODUCT: 'product',
  DEVELOP: 'develop',
};

const getMode = () => {
  return process.env.MODE || MODE.PRODUCT;
};

module.exports = {
  MODE,
  getMode,
};
