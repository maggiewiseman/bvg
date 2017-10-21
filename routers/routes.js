const express = require('express');
const mw = require('./middleware');
const handler = require('../handler').handle;
const csrf = require('csurf');

const csrfProtection = csrf({ cookie: true });
const router = express.Router();


router.get('/', (req,res) => {
    res.redirect('/directory');
});

router.get('/directory/:memberId', mw.loggedInCheck, mw.signedPetitionCheck2, csrfProtection, (req, res)=> {
    console.log('ROUTER: inside get /directory/loggedin');

    handler('directory', req, res);
});

router.route('/directory')
    .all(csrfProtection)
    .get(mw.loggedInCheck, mw.signedPetitionCheck, (req, res)=> {
        console.log('csrf token:', req.csrfToken());
        res.render('directory', {csrfToken: req.csrfToken(), nav: {loggedin: true}});
    });



//if they are logged in then check if signed
//if not signed go to /petition page
router.route('/register')
    .all(csrfProtection)

    .get(mw.registerLoginCheck, (req, res) => {
        res.render('register', {csrfToken: req.csrfToken()});
    })

    .post((req, res) => {
        handler('registerUser', req, res);
    });

router.route('/login')
    .all(csrfProtection)
    .get(mw.registerLoginCheck, (req, res) => {
        res.render('login', {csrfToken: req.csrfToken()});
    })

    .post((req, res) => {
        handler('login', req, res);
    });

router.route('/profile')
    .all(csrfProtection)

    .get(mw.loggedInCheck, mw.profileCheck, (req, res) => {
        res.render('profile', {csrfToken: req.csrfToken(), nav : { loggedin: true } });
    })

    .post((req, res) => {
        handler('addProfile', req, res);
    });

router.route('/profile/edit')
    .all(csrfProtection)
    .get(mw.loggedInCheck, (req,res) => {
        console.log(req.session.user);
        handler('getProfile', req, res);
    })

    .post((req, res) => {
        console.log('ROUTES post updateProfile, handing off to handler');
        handler('updateProfile', req, res);
    });

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err) {
            console.error(err);
        } else {
            console.log('ROUTER: user logged out');
        }
    });
    res.redirect('/login');
});


router.use((req,res) => {
    console.error('File Not Found, 404');
    res.status(404);
    res.render('404');
});

module.exports = router;
