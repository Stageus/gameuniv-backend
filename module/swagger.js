const swaggerUi = require('swagger-ui-express');
const swaggereJsdoc = require('swagger-jsdoc');
const userSwagger = require('../swagger/userSwagger.json');

const options = {
    swaggerDefinition: {
        info: {
            title: 'swagger test',
            version: '1.0.0',
            description: 'swagger test with express server'
        },
        host: '52.79.237.225:443',
        basePath: '/',
        paths: userSwagger
    },
    apis: ['./routes/*.js', './swagger/*']
}

const specs = swaggereJsdoc(options);

module.exports = {
    swaggerUi,
    specs
};