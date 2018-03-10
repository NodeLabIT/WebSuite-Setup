"use strict";

if(process.versions.node.split(".")[0] < 4) {
    console.log("Node.js-Version not sufficient. Please update Node.js to Version 4 or newer");
    return;
}

const express = require('express');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const mysql = require('mysql');
const nodemailer = require('nodemailer');
const wget = require('wget');
const targz = require('targz');

const path = require('path');
const fs = require('fs');

let step = 3;

const steps = {
    1: "welcome",
    2: "download-core",
    3: "setup-web",
    4: "setup-sql",
    5: "setup-mail",
    6: "setup-user"
};

let app = express();

app.engine('.hbs', exphbs({ defaultLayout: 'index', extname: '.hbs' }));
app.set('view engine', '.hbs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/', express.static('public'));

app.use((req, res, next) => {
    next();
});

app.get('/', (req, res) => {
    res.redirect('/welcome');
});

// PAGE: Welcome
app.get('/welcome', (req, res) => {
    if(step === 1) {
        res.render('welcome', {step});
    } else {
        res.redirect("/" + steps[step]);
    }
});

// POST: Welcome
app.post('/welcome', (req, res) => {
    if(step === 1) {
        if(req.body.accept === "true") {
            step = 2;
            res.end(JSON.stringify({accepted: true}));
        } else {
            res.end(JSON.stringify({accepted: false}));
        }
    } else {
        res.end(JSON.stringify({accepted: false}));
    }
});

// PAGE: Download Core
app.get('/download-core', (req, res) => {
    if(step === 2) {
        res.render('download-core', {step, dir: path.normalize(__dirname + "/../websuite/")});
    } else {
        res.redirect("/" + steps[step]);
    }
});

let installProgress = 0;
let installError = false;
let installing = false;

// POST: Download Core
app.post('/download-core', (req, res) => {
    if(step === 2) {
        if(installing) {
            if(installError) {
                res.end(JSON.stringify({status: "error"}));
            } else {
                res.end(JSON.stringify({status: installProgress}));
            }
            return;
        }
        installing = true;
        if (!fs.existsSync(__dirname + "/../websuite/")){
            fs.mkdirSync(__dirname + "/../websuite/");
        }
        const download = wget.download("https://xorg.nodelab-it.de/websuite/LATEST/websuite.tar.gz", __dirname + "/../websuite/websuite.tar.gz");
        res.end(JSON.stringify({status: "started"}));
        download.on('error', (err) => {
            console.log("Download-Error occurred: " + err.message);
            installError = true;
        });

        download.on('end', (output) => {
            console.log("Download complete. Unpacking WebSuite...");

            // UNPACK WEBSUITE
            targz.decompress({
                src: __dirname + '/../websuite/websuite.tar.gz',
                dest: __dirname + '/../websuite/'
            }, err => {
                if(err) {
                    console.log("Unpack-Error occurred: " + err.message);
                    installError = true;
                    return;
                }
                installProgress = 60;
                console.log("WebSuite unpack complete");

                // UNPACK CORE
                targz.decompress({
                    src: __dirname + '/../websuite/core.tar.gz',
                    dest: __dirname + '/../websuite/core/'
                }, err => {
                    if(err) {
                        console.log("Unpack-Error occurred: " + err.message);
                        installError = true;
                        return;
                    }
                    installProgress = 70;
                    console.log("Core unpack complete");

                    // UNPACK SYSTEM
                    targz.decompress({
                        src: __dirname + '/../websuite/system.tar.gz',
                        dest: __dirname + '/../websuite/system/'
                    }, err => {
                        if(err) {
                            console.log("Unpack-Error occurred: " + err.message);
                            installError = true;
                            return;
                        }
                        installProgress = 80;
                        console.log("System unpack complete");

                        // UNPACK CP
                        targz.decompress({
                            src: __dirname + '/../websuite/cp.tar.gz',
                            dest: __dirname + '/../websuite/cp/'
                        }, err => {
                            if(err) {
                                console.log("Unpack-Error occurred: " + err.message);
                                installError = true;
                                return;
                            }
                            installProgress = 90;
                            console.log("CP unpack complete");

                            // UNPACK FRONTEND
                            targz.decompress({
                                src: __dirname + '/../websuite/frontend.tar.gz',
                                dest: __dirname + '/../websuite/frontend/'
                            }, err => {
                                if(err) {
                                    console.log("Unpack-Error occurred: " + err.message);
                                    installError = true;
                                    return;
                                }
                                installProgress = 99;
                                console.log("Frontend unpack complete");

                                // CLEANUP
                                fs.unlinkSync(__dirname + "/../websuite/websuite.tar.gz");
                                fs.unlinkSync(__dirname + "/../websuite/core.tar.gz");
                                fs.unlinkSync(__dirname + "/../websuite/system.tar.gz");
                                fs.unlinkSync(__dirname + "/../websuite/cp.tar.gz");
                                fs.unlinkSync(__dirname + "/../websuite/frontend.tar.gz");

                                step = 3;
                                installProgress = 100;
                            });
                        });
                    });
                });
            });
        });

        let lastLog = Date.now();

        download.on('progress', (progress) => {
            if(Date.now() > lastLog + 1000) {
                console.log("Download-Progress: " + Math.round(progress * 100) + "%");
                lastLog = Date.now();
            }
            installProgress = Math.round(progress * 50);
        });
    } else {
        res.redirect("/" + steps[step]);
    }
});

app.post('/download-core-status', (req, res) => {
    if(installError) {
        res.end(JSON.stringify({status: "error"}));
    } else {
        res.end(JSON.stringify({status: installProgress}));
    }
});

// PAGE: Setup Socket
app.get('/setup-web', (req, res) => {
    if(step === 3) {
        res.render('setup-web', {step});
    } else {
        res.redirect("/" + steps[step]);
    }
});

app.post('/setup-web', (req, res) => {
    if(step === 3) {
        if(req.body.socketAddress && req.body.webPort && req.body.secretKey && req.body.socketPort && (req.body.webPort = parseInt(req.body.webPort)) && (req.body.socketPort = parseInt(req.body.socketPort))) {
            if(req.body.webPort <= 1024 || req.body.webPort >= 49152 || req.body.socketPort <= 1024 || req.body.socketPort >= 49152 || req.body.webPort === req.body.socketPort) {
                res.end(JSON.stringify({saved: false}));
                throw new Error("invalid ports: ports must be between 1025 and 49152 and socket.io-port can not be equal to the webserver-port");
            }
            fs.rename(__dirname + "/../websuite/config.example.json", __dirname + "/../websuite/config.json", (err) => {
                if(err) {
                    res.end(JSON.stringify({saved: false}));
                    throw err;
                }

                fs.readFile(__dirname + "/../websuite/config.json", (err, content) => {
                    if(err) {
                        res.end(JSON.stringify({saved: false}));
                        throw err;
                    }

                    content = JSON.parse(content);

                    content.server.webserver = req.body.webPort;
                    content.server.socketio = req.body.socketPort;
                    content.secretKey = req.body.secretKey;
                    fs.writeFile(__dirname + "/../websuite/config.json", JSON.stringify(content, null, 2), (err) => {
                        if(err) {
                            res.end(JSON.stringify({saved: false}));
                            throw err;
                        }

                        fs.writeFile(__dirname + "/../websuite/frontend/src/config/settings.json", JSON.stringify({connectionUrl: req.body.socketAddress}, null, 2), (err) => {
                            if(err) {
                                res.end(JSON.stringify({saved: false}));
                                throw err;
                            }

                            fs.writeFile(__dirname + "/../websuite/cp/src/settings.json", JSON.stringify({connectionUrl: req.body.socketAddress}, null, 2), (err) => {
                                if(err) {
                                    res.end(JSON.stringify({saved: false}));
                                    throw err;
                                }

                                step = 4;
                                res.end(JSON.stringify({saved: true}));
                            });
                        });
                    });
                });
            });
        } else {
            console.log("Required Input-fields not set");
            res.end(JSON.stringify({saved: false}));
        }
    } else {
        res.redirect("/" + steps[step]);
    }
});

// PAGE: Setup SQL-Database
app.get('/setup-sql', (req, res) => {
    if(step === 4) {
        res.render('setup-sql', {step});
    } else {
        res.redirect("/" + steps[step]);
    }
});

// PAGE: Setup Mail
app.get('/setup-mail', (req, res) => {
    if(step === 5) {
        res.render('setup-mail', {step});
    } else {
        res.redirect("/" + steps[step]);
    }
});

// PAGE: Setup User
app.get('/setup-user', (req, res) => {
    if(step === 6) {
        res.render('setup-user', {step});
    } else {
        res.redirect("/" + steps[step]);
    }
});

// 404 - Page not Found
app.use((req, res, next) => {
    res.status(404).render("404", {step: false});
});

// 500 - Internal Server Error
app.use(function (err, req, res, next) {
    res.status(500).render('500', {step: false});
});

// Let the server listen
app.listen(8080, () => {
    console.log("Listening on port 8080");
});