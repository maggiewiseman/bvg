const spicedPg = require('spiced-pg');
var localUrl = '';

if(!process.env.DATABASE_URL) {
    const secrets = require('./secrets.json');
    localUrl = `postgres:${secrets.dbUser}:${secrets.pass}@localhost:5432/bgv`;
}
var dbUrl = process.env.DATABASE_URL || localUrl;

const db = spicedPg(dbUrl);
//db returns a promise and you will get back a result
function getSigners() {
    console.log('DBQUERY: in getSigners');
    let queryStr = 'SELECT users.first_name, users.last_name, user_profiles.age, user_profiles.city, user_profiles.homepage FROM users INNER JOIN signatures ON users.id = signatures.user_id LEFT OUTER JOIN user_profiles ON users.id = user_profiles.user_id';
    //let queryStr = 'SELECT users.first_name, users.last_name FROM users JOIN signatures ON users.id = signatures.user_id';
    return db.query(queryStr).then((result) => {
        console.log('DBQUERY getSigners:', result.rows);
        return(result.rows);
    }).catch(e => console.error(e.stack));
}

function getSignersByCity(cityName) {
    console.log('DBQUERY signersByCity: ', cityName);
    let queryStr = 'SELECT users.first_name, users.last_name, user_profiles.age, user_profiles.city, user_profiles.homepage FROM users INNER JOIN signatures ON users.id = signatures.user_id JOIN user_profiles ON users.id = user_profiles.user_id WHERE user_profiles.city = $1;';
    return db.query(queryStr, cityName).then((result) => {
        console.log('DBQUERY gotSignersByCity:', result.rows);
        return(result.rows);
    }).catch(e => console.error(e.stack));
}

function addSignature(userData) {
    //userData is an array: first_name, last_name, signature
    console.log('DBQUERY: in add signature');
    let queryStr = 'INSERT INTO signatures (signature, user_id) VALUES ($1, (SELECT id from users WHERE id=$2)) RETURNING id';
    // let queryStr = 'INSERT INTO signatures (user_id, signature) VALUES ($1, $2) RETURNING id';
    return db.query(queryStr, userData);
}

function getSignature(id) {
    console.log('DBQUERY: in getSignature()');
    let param = Array.isArray(id) ? id: [id];
    let queryStr = 'SELECT signature FROM signatures WHERE id = $1';
    return db.query(queryStr, param).then((result) => {
        return(result.rows);
    }).catch(e => console.error(e.stack));
}

function numSignatures() {
    let queryStr = 'SELECT COUNT(*) FROM signatures';
    return db.query(queryStr).then((result) => {
        return(result.rows[0].count);
    }).catch(e => console.error(e.stack));
}

//then we need to query the database to add user with an array that has first_name, last_name, email, hashed password
function addUser(userInfo) {
    console.log('DBQUERY: in add user.');
    let queryStr = 'INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING id';
    return db.query(queryStr, userInfo).then((result) => {
        return(result.rows);
    });
}

//dbQuery to get password, first_name and last_name and id from users table using e-mail
function getUserInfo(email) {
    console.log('DBQUERY: in getUserInfo');
    let queryStr = 'SELECT id, first_name, last_name, password FROM users WHERE email = $1';
    return db.query(queryStr, email);
}

function getSigId(user_id) {
    console.log('DBQUERY: in getSigId, user_id = ', user_id);
    let queryStr = 'SELECT id FROM signatures WHERE user_id = $1';
    return db.query(queryStr, user_id).then((result) => {
        return(result);
    });
}

function addProfile(profileData) {
    console.log('DBQUERY in addProfile, user_id = ', profileData);
    let queryStr = 'INSERT INTO user_profiles (user_id, age, city, homepage) VALUES ((SELECT id from users WHERE id=$1), $2, $3, $4)';
    return db.query(queryStr, profileData);
}

function getProfileId(user_id) {
    console.log('DBQUERY in getProfileId, user_id=', user_id);
    let queryStr ='SELECT id FROM user_profiles WHERE user_id = $1';
    return db.query(queryStr, user_id);
}

function getProfile(id) {
    console.log('DBQUERY in getProfile, user_id=', id);
    let queryStr ='SELECT users.email, user_profiles.age, user_profiles.city, user_profiles.homepage, user_profiles.id FROM users LEFT OUTER JOIN user_profiles ON users.id = user_profiles.user_id WHERE users.id = $1';
    return db.query(queryStr, id);
}

function updateUser(userData) {
    console.log('DBQUERY in updateProfile, userData = ', userData);
    let queryStr = 'UPDATE users SET first_name = $1, last_name = $2, email = $3 WHERE id = $4';
    return db.query(queryStr, userData);
}

function updateProfile(profileData) {
    console.log('DBQUERY in updateProfile, profileData', profileData);
    let queryStr = 'UPDATE user_profiles SET age = $2, city = $3, homepage = $4 WHERE user_id = $1';
    return db.query(queryStr, profileData);
}

function deleteSig(id) {
    console.log('DBQUERY in delete Sig sigId:', id);
    let queryStr = 'DELETE FROM signatures WHERE id = $1';
    return db.query(queryStr, id);
}

module.exports.getSigners = getSigners;
module.exports.addSignature = addSignature;
module.exports.getSignature = getSignature;
module.exports.numSignatures = numSignatures;
module.exports.addUser = addUser;
module.exports.getUserInfo = getUserInfo;
module.exports.getSigId = getSigId;
module.exports.addProfile = addProfile;
module.exports.getSignersByCity = getSignersByCity;
module.exports.getProfile = getProfile;
module.exports.getProfileId = getProfileId;
module.exports.updateUser = updateUser;
module.exports.updateProfile = updateProfile;
module.exports.deleteSig = deleteSig;
