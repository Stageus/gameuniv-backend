const multer = require('multer');
const multerS3 = require('multer-s3-transform');
const AWS = require('aws-sdk');
const awsConfig = require('../config/awsConfig');
const makeRandomNumber = require('../module/makeRandomNumber');

AWS.config.update(awsConfig);

const uploadMulter = multer({
    storage: multerS3({
        s3 : new AWS.S3(),
        bucket : "jochong/gameuniv_user_profile",
        contentType : multerS3.AUTO_CONTENT_TYPE,
        key : (req, file, cb) => {
            const randomNumber = makeRandomNumber(6);
            const date = new Date();
            cb(null, `profileImg-${date.getTime()}-${randomNumber}`);
        },
        acl : 'public-read',
        contentType : multerS3.AUTO_CONTENT_TYPE,
    }),
    fileFilter : async (req, file, cb)=>{
        if(!(file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg")){
            cb({ message : 'invalid file type', statusCode : '400'});
        }else{
            cb(null, true);
        }
    },
    limits : {
        fileSize: 1 * 1024 * 1024, //1MB
        files : 1
    }
});

module.exports = async (req, res, next) => {
    uploadMulter.single('profileImg')(req, res, (err) => {
        if(err){
            console.log(err);

            //send result
            res.status(parseInt(err.statusCode) || 409).send({
                message : err.message || 'unexpected error occrued'
            });
        }else{
            next();
        }
    })
};