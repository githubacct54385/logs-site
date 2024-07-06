const { Router } = require('express');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(process.env.SQLITE);

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

