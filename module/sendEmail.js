const nodemailer = require('nodemailer');
const gmailConfig = require('../config/gmailConfig');
const myMail = gmailConfig.gmail;
const myPassword = gmailConfig.password;

module.exports =  (email, contents, subject = '인증번호') => {
    return new Promise(async (resolve, reject) => {
        const transport = nodemailer.createTransport({
            service : "gmail",
            auth : {
                user : myMail,
                pass : myPassword
            }
        });
    
        const mailOption = {
            from : myMail,
            to : email,
            subject : `gameuniv ${subject}`,
            html : `<h1>${contents}</h1>`
        }

        transport.sendMail(mailOption, (err, info) => {
            if(err){
                reject(err);
            }else{
                resolve(info);
            }
        })
    })
}