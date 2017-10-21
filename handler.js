const dbQuery = require('./dbQuery');
const help = require('./helpers');
const redis = require('redis');
const nav = { loggedin: true };

//var host = process.env.REDIS_URL || 'localhost';
const client =redis.createClient(process.env.REDIS_URL || {host:'localhost', port: 6379});

client.on('error', (err) => {
    console.log(err);
});

function pmGetCache(key){
    console.log('HANDLER pmGetCache.');
    return new Promise((resolve, reject) => {
        client.get(key, function(err, data){
            if (err) {
                reject(err);
            } else {
                console.log('HANDLER getCache about to resolve: ', data);
                resolve(data);
            }
        });
    });
}

function pmSetCache(key, value, time) {
    console.log('HANDLER pmSetCache.');
    return new Promise((resolve, reject) => {

        client.set(key, value, 'EX', time, (err,data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}


function handle(query, req, res) {

    /**
    returns list of people who have signed for signatures page.
    will need to get city and age here
    **/
    if(query == 'getSigners') {
        //here we are going to check redis first and if jonks is there, we're going to send that back.
        pmGetCache('signers').then((data) => {
            if(data) {
                console.log(data);
                var results = JSON.parse(data);
                res.render('signatures', {results: results, nav: nav});
            } else {
                //there's no signature data stored, need to query db
                console.log('data is null');
                return dbQuery.getSigners().then((result) => {
                    var time = 14*24*60;
                    pmSetCache('signers', JSON.stringify(result), time).then(()=>{
                        res.render('signatures', {results: result, nav: nav});
                    });
                });
            }
        }).catch(e => console.error(e.stack));
    }

    if(query == 'signersByCity') {
        let cityName = req.params.city;
        return dbQuery.getSignersByCity([cityName]).then((results) => {
            res.render('city', {nav: nav, cityName: cityName,
                results: results});
        }).catch(e => console.error(e.stack));
    }

    if(query == 'thankyou') {
        console.log('HANDLER: SigId:', req.session.user.sigId);

        let promiseArr = [];
        promiseArr.push(dbQuery.numSignatures());
        promiseArr.push(dbQuery.getSignature(req.session.user.sigId));

        return Promise.all(promiseArr).then((results)=> {
            res.render('thankyou', {count: results[0], 'imgsrc': results[1][0].signature, csrfToken: req.csrfToken(), nav: nav});
        }).catch(e => console.error(e.stack));
    }

    if(query == 'addSignature') {
        var validParams = help.validate([req.body.signature, req.session.user.id]);

        dbQuery.addSignature(validParams).then((result) => {
            console.log('HANDLER: result of addSig: ', result);
            req.session.user.sigId = result.rows[0].id;
            return delCached('signers');
        }).then(()=>{
            res.redirect('/petition/signed');

        }).catch(e => {
            console.error(e.stack);
            res.render('petition', { 'error' : true,
                csrfToken: req.csrfToken(),
                nav: nav
            });
        });
    }

    if(query == 'registerUser') {

        return new Promise((resolve, reject) => {
            if(!(req.body.first_name && req.body.last_name && req.body.email && req.body.password)){
                reject('All fields are required when registering');
            } else {
                resolve();
            }
        }).then(() => {
            var validUserInfo = setUserData(req);
            //need to hash the signature
            return help.hashPassword(validUserInfo[3]).then((hash) =>{
                validUserInfo[3] = hash;
                //then we need to query the database to add signature with an array that has first_name, last_name, email, hashed password
                return dbQuery.addUser(validUserInfo);
            });
        }).then((id) =>{
            //when that comes back successfully with an id, we need to set session.user with first name, last name and user_id
            console.log('HANDLER: add user id', id);
            req.session.user = {
                id: id[0].id,
                first_name: req.body.first_name,
                last_name: req.body.last_name
            };

            console.log("HANDLER: registerUser session info", req.session.user);
            //then route to /petition and petition will do the logic of checking for signature and log in
            res.redirect('/profile');
        }).catch(e => {
            console.error(e);
            res.render('register', { 'errorMsg' : e, csrfToken: req.csrfToken()});
        });

    }

    var userInfo;
    if(query == 'login') {

        //put email into an array b/c that's how the query needs it
        let email = [req.body.email];
        let loginCacheKey = 'login_attempts_' + JSON.stringify(email);
        let lockedCacheKey = 'locked_out_' + JSON.stringify(email);
        // let loginCacheKey = 'login_attempts_';
        // let lockedCacheKey = 'locked_out_' ;
        console.log('loginCacheKey', loginCacheKey);
        console.log('lockedCacheKey', lockedCacheKey);
        return pmGetCache(lockedCacheKey).then((lockedOutInfo)=>{
            if(!lockedOutInfo) {
                return dbQuery.getUserInfo(email).then((returnedUserInfo)=>{
                    //show me stuff that came back
                    //console.log('HANDLER login returnedUserINfo ', returnedUserInfo);

                    if(returnedUserInfo.rowCount == 0) {
                        console.error('User does not exist');
                        throw new Error ('User does not exist');
                    }

                    userInfo = returnedUserInfo.rows[0];

                    console.log('HANDLER: login: userInfo:', userInfo);
                    console.log('HANDLER: login: password', userInfo.password);
                    //check password

                    return help.checkPassword(req.body.password, userInfo.password);
                });
            } else {
                lockedOutInfo = JSON.parse(lockedOutInfo);
                lockedOutInfo.timer = lockedOutInfo.timer * 2;
                return pmSetCache(lockedCacheKey, JSON.stringify(lockedOutInfo), lockedOutInfo.timer).then(()=>{
                    throw new Error(`Account is locked. You will need to wait ${lockedOutInfo.timer} seconds`);
                });

            }
        }).then((validPass)=>{

            if(!validPass) {
                console.log('HANDLER login: invalid password');
                return pmGetCache(loginCacheKey).then((numLoggedIn) => {
                    if(!numLoggedIn) {
                        console.log('HANDLER login: first failed attempt');
                        //this is their first failed login or the timer ran out
                        //set a new cache
                        return pmSetCache(loginCacheKey, 1, 60);
                    } else {
                        console.log('HANDLER login: numLoggedIn before increment: ', numLoggedIn);
                        //they have logged in before!
                        numLoggedIn = parseInt(numLoggedIn, 10);
                        numLoggedIn++;
                        let time = 60;
                        return pmSetCache(loginCacheKey, numLoggedIn, time).then(()=>{
                            console.log('HANDLER login: numloggedIn incremented, reset cache');
                            return numLoggedIn;
                        });
                    }
                }).then((numLoggedIn)=>{
                    if(numLoggedIn > 2) {
                        console.log('HANDLER login: too many login attempts');
                        //too many attempts!
                        //set a flag that prevents this login function from running at all.
                        //send an appropriate error message.
                        let lockOutInfo = {
                            timer: 90
                        };
                        return pmSetCache(lockedCacheKey, JSON.stringify(lockOutInfo), lockOutInfo.timer).then(()=> {
                            throw new Error('Too many attempts to login. Your account is locked.');
                        });
                    } else {
                        console.log('HANDLER login: less than 3 attempts, throwing error');
                        throw new Error('Password Invalid');
                    }
                });
            }
        }).then(()=>{
            return pmGetCache(lockedCacheKey);
        }).then((lockedOutInfo) => {
            console.log('HANDLER login: checking lockout');
            if(!lockedOutInfo){
                console.log('HANDLER login: locked out is nil');
                req.session.user = {
                    id: userInfo.id,
                    first_name: userInfo.first_name,
                    last_name: userInfo.last_name
                };
                console.log('HANDLER: set req.session.user info');
                return delCached(loginCacheKey);

            } else {
                lockedOutInfo = JSON.parse(lockedOutInfo);
                console.log('LOCKED OUT INFO: ', lockedOutInfo);
                lockedOutInfo.timer = lockedOutInfo.timer * 2;

                console.log('HANDLER login: user lockedOut. Time to wait: ', lockedOutInfo.timer);
                return pmSetCache(lockedCacheKey, true, lockedOutInfo.timer).then(()=> {
                    throw new Error(`Account is locked. You will need to wait ${lockedOutInfo.timer} seconds`);
                });
            }
        }).then(()=>{
            //then using user id see if they have a signature.
            return dbQuery.getSigId([userInfo.id]);
        }).then((results)=>{
            if(results.rowCount > 0) {
                console.log('HANDLER: login session id added');
                //so they have a signature
                req.session.user.sigId = results.rows[0].id;
            }
            res.redirect('/petition');

        }).catch(e => {
            console.error(e.stack);
            res.render('login', { 'errorMsg' : e.message, csrfToken: req.csrfToken() });
        });
    }

    if(query == 'addProfile') {

        req.session.user.profile = true;
        return addProfile(req, res).catch(e => {
            console.error(e.stack);
            res.render('profile', { 'error' : true, csrfToken: req.csrfToken(), nav: nav });
        });

    }

    if(query == 'getProfile') {
        return renderProfile(req, res).then((results)=>{
            console.log('HANDLER userInfo to send to edit profile template: ', results);
            results.csrfToken = req.csrfToken();
            results.nav = nav;
            res.render('edit', results);
        }).catch(e => {
            console.error(e.stack);
            res.render('edit', { 'errorMsg' : e, csrfToken: req.csrfToken() });
        });
    }

    if(query == "updateProfile") {

        return delCached('signers').then(() => {
            //does this person exist in users_profiles?
            return dbQuery.getProfileId([req.session.user.id]).then((results) => {
                console.log('HANDLER updateProfile results: ', results);

                if(results.rows.length > 0) {
                    //user exists so now we can
                    //update profile
                    console.log('HANDLER: user exists so now we are going to update');
                    var userProfile = setUserProfile(req);
                    var userData = setUserData(req);

                    let promiseArr = [];
                    promiseArr.push(dbQuery.updateProfile(userProfile));
                    promiseArr.push(dbQuery.updateUser(userData));

                    return Promise.all(promiseArr).then(() => {
                        res.redirect('/petition');
                    });
                } else {
                    //add user_profile
                    return addProfile(req, res);
                }
            });
        }).catch(e => {
            console.error(e.stack);
            res.redirect('/profile/edit');
        });
    }

    if(query == 'deleteSig') {
        dbQuery.deleteSig([req.session.user.sigId]).then(() => {
            req.session.user.sigId = null;
            res.redirect('/petition');
        }).catch(e => {
            console.error(e.stack);
            res.redirect('/petition');

        });
    }
}

function delCached(key){
    return new Promise((resolve, reject) => {
        client.del(key, (err, data) => {
            if(err){
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

function renderProfile(req, res) {
    return dbQuery.getProfile([req.session.user.id]).then((results) => {
        console.log('HANDLER getProfile results: ', results.rows[0]);

        let userInfo = results.rows[0] || {};
        userInfo.first_name = req.session.user.first_name;
        userInfo.last_name = req.session.user.last_name;

        return userInfo;
    });
}

function setUserData(req) {

    var userInfo = [req.body['first_name'], req.body['last_name'], req.body['email']];
    if(req.body.password) {
        userInfo.push(req.body['password']);
    } else {
        userInfo.push(req.session.user.id);
    }

    return userInfo = help.validate(userInfo);
}

function setUserProfile(req) {
    var userProfile = [req.session.user.id, req.body['age'], req.body['city'], req.body['homepage']];
    return userProfile = help.validate(userProfile);
    //console.log('HANDLER add_profile: validUserInfo', userProfile);
}

//used by addProfile and updateProfile in the case where there's no profile for a new user
function addProfile(req,res) {
    let userProfile = setUserProfile(req);

    if(!userProfile[1] && !userProfile[2] && !userProfile[3]) {
        console.log('HANDLER addProfile func: all values null');
        res.redirect('/petition');
    } else {
        //add them to the database
        return dbQuery.addProfile(userProfile).then(() => {
            res.redirect('/petition');
        });
    }
}

module.exports.handle = handle;

/** TESTS **/



// var registrationBody = {
//     first_name: 'Tiffany',
//     last_name: 'Theiessen',
//     email: 'Tif@gmail',
//     password: 'ilovezack'
// };
// //
// // var registrationBodyNull = {
// //     first_name: '',
// //     last_name: 'Theiessen',
// //     email: 'Tif@gmail',
// //     password: ''
// // };
// //
// console.log(validateUser(registrationBody));
// console.log(validateUser(registrationBodyNull));
//
// var registration = { body: {
//     first_name: 'Jennifer',
//     last_name: 'Aniston',
//     email: 'Jen@gmail',
//     password: 'istilllovebrad'
// }};
//
// var registration = { body: {
//     first_name: 'Louis',
//     last_name: 'CK',
//     email: 'louis@gmail',
//     password: 'noonelovesme'
// }};
//
// handle('registerUser', registration);

//Failing tests:
//bcrypt throws error
// var registrationNullPW = { body: {
//     first_name: 'Tiffany',
//     last_name: 'Theiessen',
//     email: 'Tif@gmail',
//     password: ''
// }};
//
// handle('registerUser', registrationNullPW);

//database throws error
// var registrationNullName = { body: {
//     first_name: '',
//     last_name: 'Theiessen',
//     email: 'Tif@gmail',
//     password: 'ilovezack'
// }};
//
// handle('registerUser', registrationNullName);

//check pass returns a boolean
//checkPassword('ilovezack', '$2a$10$uC5KEwHDIUBkEqoBy8BLqO2X0i7hcFdbBGRI4r545Kg21FDAvnwhO');

// var login = { body: {
//     email: 'Tif@gmail',
//     password: 'ilovezack'
// }};
//
// handle('login', login);

// var login2 = { body: {
//     email: 'louis@gmail',
//     password: 'noonelovesme'
// }};
//
// handle('login', login2);
// var loginBad = { body: {
//     email: 'Tif@gmail',
//     password: 'ilovezac'
// }};
//
// handle('login', loginBad);
