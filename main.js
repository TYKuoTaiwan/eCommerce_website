var http = require("http");
var express=require("express");
var session = require('express-session');
var app=express();
var mysql = require('mysql');
var fs = require('fs');
var path = require('path');
var HOST = 'localhost';
var PORT = 3306;
var MYSQL_USER = 'root';
var MYSQL_PASS = 'priyamvada';
var DATABASE = 'dbproj2';
var TABLE = 'user_entry';


var _dirname = "E:\eCommerce_Proj";

var mysql = mysql.createConnection({
    host: HOST,
    port: PORT,
    user: MYSQL_USER,
    password: MYSQL_PASS,
    database: DATABASE
});


app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(session({cookieName: 'session',secret: 'ssshhhhh', saveUninitialized: true, resave: true}));
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'html');	
app.use(app.router);
var route=app.Router();	




app.get("/home",function(req,res){
	sess = req.session;
	res.render("home.html");
});

http.createServer(app).listen(4000);