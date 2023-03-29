'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
const { objectID } = require('mongodb');
const LocalStrategy = require('passport-local');

const app = express();

app.set('view engine', 'pug');
app.set('views', './views/pug');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');
  
  app.route('/').get((req, res) => {
    res.render('index', { title: 'Connected to Database', message: 'Please log in', showLogin: true });
  });

  app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/profile');
  });

  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render('profile', { username: req.user.username });
  });

  passport.use(new LocalStrategy((username, password,) => {
    myDataBase.fineOne({username: username}, (err, user) => {
      console.log(`User ${username} attempted to log in.`);
      if (err) {
        return done(err);
      } else if (!user) {
        return done(null, false);
      } else if (password !== user.password) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    });
  }));
  
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new objectID(id) }, (err, done) => {
      done(null, doc);
    });
  });

}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/');
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
