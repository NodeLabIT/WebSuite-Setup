'use strict';

if(process.versions.node.split(".")[0] < 4) {
    console.log("Node.js-Version not sufficient. Please update Node.js to Version 4 or newer");
    return;
}

const express = require('express');
const exphbs = require('express-handlebars');
const mysql = require('mysql');
const nodemailer = require('nodemailer');

let step = 0;

let app = express();

app.engine('.hbs', exphbs({ defaultLayout: 'index', extname: '.hbs' }));
app.set('view engine', '.hbs');

app.use('/', express.static('public'));

app.use((req, res, next) => {
    next();
});

app.get('/', (req, res) => {
    res.redirect('/welcome');
    step = 1;
});

app.get('/welcome', (req, res) => {
    res.render('welcome');
});

app.post('/welcome', (req, res) => {
    res.redirect('welcome');
});

app.get('/download-core', (req, res) => {
    res.render('download-core');
});

app.get('/setup-socket', (req, res) => {
    res.render('setup-socket');
});

app.get('/setup-sql', (req, res) => {
    res.render('setup-sql');
});

app.get('/setup-mail', (req, res) => {
    res.render('setup-mail');
});

app.get('/setup-user', (req, res) => {
    res.render('setup-user');
});

// 404 - Page not Found
app.use((req, res, next) => {
    res.status(404).render("404");
});

// 500 - Internal Server Error
app.use(function (err, req, res, next) {
    res.status(500).render('500');
});

// Let the server listen
app.listen(8080, () => {
    console.log("Listening on port 8080");
});