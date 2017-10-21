const express = require('express');
//const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const hb = require('express-handlebars');
const compression = require('compression');



var session = require('express-session'),
    Store = require('connect-redis')(session);


var secret = process.env.SESSION_SECRET || require('./secrets.json').sessionSecret;
var host = process.env.REDIS_URL || 'localhost';

const app = express();


//cofigure handlebars
app.engine('handlebars', hb());
app.set('view engine', 'handlebars');
app.engine('handlebars', hb({defaultLayout: 'main'}));

app.use(compression());
app.use(express.static(__dirname + '/public'));
app.use(require('body-parser').urlencoded({
    extended: false
}));

var sessionStore = {};
if(process.env.REDIS_URL){
    sessionStore = {
        url: process.env.REDIS_URL
    };
} else {
    sessionStore = {
        ttl: 3600, //time to live
        host: host,
        port: 6379
    };
}

app.use(cookieParser());
app.use(session({
    store: new Store(sessionStore),
    resave: true,
    saveUninitialized: true,
    secret: secret
}));


// app.use(cookieSession({
//     name: 'session',
//     secret: secret,
//     // Cookie Options
//     maxAge: 14 * 24 * 60 * 60 * 1000 // 24 hours
// }));


app.use(require('./routers/routes'));

app.listen(process.env.PORT || 8080, ()=> {
    console.log('Listening on port 8080');
});
