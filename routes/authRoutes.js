const { Router } = require('express');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(process.env.SQLITE);
const nodemailer = require('nodemailer');
const { DateTime } = require('luxon');

const router = Router();
router.get('/signup', (req, res) => {
  res.render('pages/signup', {
    emailError: '',
    passwordError: '',
    isAuthenticated: !!req.session.user
  });
});

router.post('/signup', (req, res) => {
  if(!isEmail(req.body.email)) {
    return res.status(400).json({email: "Email is invalid."});
  }
  if(!isGoodPassword(req.body.password)) {
    return res.status(400).json({password: "Password is not strong enough."});
  }

  db.get('select emailAddress from User where emailAddress = $emailAddress', {
    $emailAddress: req.body.email
  }, function(err, row) {
      if(row) {
        return res.status(400).json({email: "Email is taken."});
      }
      CreateUser(req.body, () => {
        res.cookie('user_cookie', req.body.email);
        req.session.user = req.body.email;
        return res.status(201).json({redirectTo: "/"});
      });
    });
});

router.get('/login', (req, res) => {
  res.render('pages/login', {
    isAuthenticated: !!req.session.user
  });
});

router.post('/login', (req, res) => {
  if(!req.body.email) {
    return res.status(400).json({email: "Email is empty."});
  }
  if(!req.body.password) {
    return res.status(400).json({password: "Password is empty."});
  }
  db.get('select emailAddress, password from User where emailAddress = $emailAddress', {
    $emailAddress: req.body.email
  }, function(err, row) {
      if(row) {
        const hash = row.password;
        bcrypt.compare(req.body.password, hash, (err, compareResult) => {
          if(compareResult) {
            res.cookie('user_cookie', req.body.email);
            req.session.user = req.body.email;
            return res.status(200).json({redirectTo: '/'});
          } else {
            return res.status(400).json({password: "You have entered an invalid username or password."})
          }
        });
      } else {
        return res.status(400).json({email: "You have entered an invalid username or password."});
      }
    })
});

router.get('/logout', (req, res) => {
  req.session.user = undefined;
  res.redirect('/');
});

router.get('/forgotPassword', (req, res) => {
  // if the user is logged in, redirect them to the change password page
  if(!!req.session.user) {
    res.redirect('/changePassword');
  }

  res.render('pages/forgotPassword', {
    isAuthenticated: !!req.session.user
  });
});

router.post('/forgotPassword', (req, res) => {
  if(!isEmail(req.body.email)) {
    return res.status(400).json({email: 'Email is empty.'});
  }

  // send email to user with otp
  const otp = generateOTP(6);
  sendEmail(req.body.email, 'Logs Site -- Forgot Password', `<h1>Logs Site</h1><h2>A request was made to change your password</h2><h3>Your OTP is ${otp}</h3>`, () => {
    // store otp in db table to verify later
    db.run('INSERT INTO Otp (otp, emailAddress, expiresAt) values ($otp, $emailAddress, $expiresAt)', {
      $otp: otp,
      $emailAddress: req.body.email,
      $expiresAt: DateTime.utc().plus({minutes: 15}).toISO() 
    }, (err, dbCallback) => {
        return res.status(200).json({Success: true});
      })
  });
});

router.post('/verifyOtp', (req, res) => {
  if(!isEmail(req.body.email)) {
    return res.status(400).json({email: 'Email is empty.'});
  }
  if(!req.body.otp || req.body.otp.length === 0) {
    return res.status(400).json({email: 'Otp is empty.'});
  }

  const currentTimeUtc = DateTime.utc();
  db.all("select emailAddress, otp, expiresAt from Otp where emailAddress = $emailAddress and JulianDay(expiresAt, '15 minutes') - JulianDay(DateTime('now')) > 0 order by createdAt DESC", {
    $emailAddress: req.body.email
  }, (err, dbCallback) => {
      if(dbCallback.some(p => 
          p.otp === req.body.otp && 
          p.emailAddress === req.body.email && 
          DateTime.fromISO(p.expiresAt).diff(currentTimeUtc, 'minutes').toObject().minutes > 0)) {
        return res.status(200).json({Success: true});
      }
      return res.status(400).json({Success: false});
    });
});

router.post('/forgotPasswordComplete', (req, res) => {
  if(!isEmail(req.body.email)) {
    return res.status(400).json({email: 'Email is empty.'});
  }
  if(!req.body.newPassword || !isGoodPassword(req.body.newPassword)) {
    return res.status(400).json({email: 'Password is not strong enough.'});
  }
  if(!req.body.confirmPassword || !isGoodPassword(req.body.confirmPassword)) {
    return res.status(400).json({email: 'Password is not strong enough.'});
  }
  if(req.body.newPassword !== req.body.confirmPassword) {
    return res.status(400).json({email: 'Passwords do not match.'});
  }

  bcrypt.hash(req.body.newPassword, saltRounds, function(err, hash) {
      // Store changed password hash in your password DB.
    db.run('UPDATE User Set Password = $password, numPasswordChanges = numPasswordChanges + 1 where emailAddress = $emailAddress', {
      $emailAddress: req.body.email,
      $password: hash
      }, (err, ret) => {
        sendEmail(req.body.email, 'Your password has been changed', `<h1>Logs Site</h1><h2>Your password has been changed.</h2><h3>Thank you for using the Logs Site.</h3>`, () => {
          return res.status(200).json({Success: true, RedirectTo: '/'}); 
        }) 
      });
  });
});

router.get('/changePassword', (req, res) => {
  // if the user is not logged in, redirect them to the forgot password page
  if(!req.session.user) {
    res.redirect('/forgotPassword');
  }

  res.render('pages/changePassword', {
    isAuthenticated: !!req.session.user
  });
});

function sendEmail(recipient, subject, emailBody, callback) {

// Create a transporter object with SMTP server details
const transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 25,
});

// Send an HTML email
transporter.sendMail({
    from: process.env.SENDER,
    to: recipient,
    subject: subject,
    html: emailBody
}).then(res => {
  callback();
}).
catch(error => {
	console.log(`Error: ${error}`);
});
}

function generateOTP(length = 4) {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
};

function CreateUser(body, callback) {
  if(!body) {
    throw "body is undefined";
  }
  bcrypt.hash(body.password, saltRounds, function(err, hash) {
      // Store hash in your password DB.
    db.run('INSERT INTO User (emailAddress, password) VALUES ($emailAddress, $password)', {
      $emailAddress: body.email,
      $password: hash
      }, (err, ret) => {
        callback();
      });
  });
}


function isEmail(email) {
    const emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    return email !== '' && email.match(emailFormat);
}

function isGoodPassword(password) {
  return password.length >= 8;
}

module.exports = router;

