module.exports = (size = 6) => {
  return Math.floor(Math.random() * 10 ** size)
    .toString()
    .padStart(size, '0');
};
