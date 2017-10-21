function registerLoginCheck(req, res, next) {

    if(req.session.user) {
        //logged in
        if(req.session.user.sigId) {
            //already signed petition
            res.redirect('/petition/signed');
        } else {
            //logged in but haven't signed petition
            res.redirect('/petition');
        }
    } else {
        //not logged in go to tregistration page
        next();
    }
}
function loggedInCheck(req, res, next) {
    if(req.session.user) {
        next();
    } else {
        res.redirect('/register');
    }
}

//called by petition route so if they've signed they get redirected
function signedPetitionCheck(req, res, next) {
    if(req.session.user.sigId) {
        res.redirect('/petition/signed');
    } else {
        next();
    }
}

//called by other stuff so if they've signed they can go ot the page requested. otherwise they get redirected back to the petition page
function signedPetitionCheck2(req,res, next) {
    if(req.session.user.sigId) {
        next();
    } else {
        res.redirect('/petition');
    }
}

function profileCheck(req, res, next) {
    console.log('Session profile flag is not being set anywher!');
    if(req.session.user.profile) {
        res.redirect('/petition');
    } else {
        next();
    }

}

module.exports.profileCheck = profileCheck;
module.exports.signedPetitionCheck2 = signedPetitionCheck2;
module.exports.signedPetitionCheck = signedPetitionCheck;
module.exports.loggedInCheck = loggedInCheck;
module.exports.registerLoginCheck = registerLoginCheck;
