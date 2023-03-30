module.exports = {
    userNameRegExp :  new RegExp(/^[가-힣]{2,4}|[a-zA-Z]{2,6}$/),
    userIdRegExp : new RegExp(/^[a-z0-9]{5,20}$/),
    userEmailRegExp : new RegExp(/^[a-zA-Z0-9+-\_.]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/),
    userPwRegExp : new RegExp(/^(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,20}$/),
}