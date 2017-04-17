var http = require("http");
var express=require("express");
var app=express();
var mysql = require('mysql');
var fs = require('fs');

var HOST = 'localhost';
var PORT = 3306;
var MYSQL_USER = 'root';
var MYSQL_PASS = 'GayuUtd@2016';
var DATABASE = 'ecommerce_project';
var TABLE = 'user_entry';

var _dirname = "C:\Users\Gayathri\Desktop\Customer_Handling"

var mysql = mysql.createConnection({
    host: HOST,
    port: PORT,
    user: MYSQL_USER,
    password: MYSQL_PASS,
    database: DATABASE
});


app.use(express.bodyParser());
app.use(app.router);
app.use(express.static(__dirname + '/public'));


app.get("/home",function(req,res){
	res.sendfile("./home.html");

	app.get("/Shirts",function(req,res){
    
    //res.sendfile("./home.html");
    
    mysql.query('SELECT * FROM  catalog ', function(err, rows, fields)
    {
        
		if (err)
            throw err;
	else
        {
		        console.log('no of records is '+rows.length);
                res.writeHead(200, { 'Content-Type': 'application/json'});
                JSON.stringify(rows);
				   for(i=0;i<rows.length;i++)
				   {
					res.write("\n Product Name \t" +rows[i].Name +"\t Price\t " +rows[i].Price + "$");
				   }
                res.end();
        
        } 
		
    });
    
});
	
	app.get("/form",function(req,res){
	res.sendfile("./form.html");  
	});
	
	app.get("/signup",function(req,res){
	res.sendfile("./signup.html"); 

        });

app.post("/form",function(req,res)
{
	
	
	//var user_name=req.body.username; 
	//var pass=req.body.pwd;
	
	var user_entry = {
		user_name : req.body.username, 
		pass_word : req.body.pwd
	}; 
	console.log(user_entry.user_name + "log" + user_entry.pass_word);
	var user_name=user_entry.user_name; 
	
	mysql.query('SELECT * FROM user_entry where user_name = ? ' , [user_name], function(err,rows)
     {
        if (err)
            throw err;
	else
        {
	uname=rows[0].user_name; 		
	pswd=rows[0].pass_word; 
	role=rows[0].role;
	console.log("user_name" +user_name + "role" +role) ; 
	
	if( pswd == user_entry.pass_word)
	{
		
	    console.log("login success" +role);
		if( role == "customer")
			{
				//res.render('/loggedin', {uid:uid});
				res.redirect('/customer_loggedin');
			}
			else
			{
				res.redirect('/supervisor_loggedin');
			}
	    
	}
	    
        else
	{
            console.log("invalid login");
	    res.send('Invalid login');
	}

           
     }
	 
	 });

});

app.post("/signup" , function(req,res)
{

first_name=req.body.firstname;
last_name=req.body.lastname; 
phone_number=req.body.phoneNum;
email_id=req.body.email;
security_question1=req.body.securityQuestion1;
security_answer1=req.body.securityAnswer1;	
user_name=req.body.UserName;
pass_word=req.body.password;
Addr_line1=req.body.addrLine1;
Addr_line2=req.body.addrLine2;
state=req.body.state;
zip_code=req.body.zipCode;

	mysql.query("Insert into customer (first_name,last_name,phone_number,email_id,security_question1,security_answer1) VALUES ('"+first_name+"','"+last_name+"','"+phone_number+"','"+email_id+"','"+security_question1+"','"+security_answer1+"') ; ",function(err, result)
    {
        if (err)
            throw err;
	else
	{
	console.log("insert into customer success");
	console.log("email_id" +email_id);
	mysql.query('SELECT * FROM customer where email_id= \""+email_id+"\" ;', function(err,rows)
     	{
        if (err)
            throw err;
	else
        {
	 uid=rows[0].uid; 
	console.log("uid" +uid);
	 mysql.query("Insert into user_entry (user_name,pass_word,uid) values ('"+user_name+"', '"+pass_word+"','"+uid+"');", function(err, result)
	  {
	if (err)
            throw err;
	else
	{
	console.log("insert into user_entry success");
	
	mysql.query("Insert into address (uid,Addr_line1,Addr_line2,state,zip_code) values ('"+uid+"','"+Addr_line1+"','"+Addr_line2+"','"+state+"','"+zip_code+"');", function(err, result) {
	if (err)
            throw err;
	console.log("sign up success")
	
	});
	
	}
		
	 });


        }

 });

}

 });
res.send('Invalid login');

});



app.get("/customer_loggedin",function(req,res){
	res.sendfile("./customer_loggedin.html");  
	
 	

app.get("/update",function(req,res){
	res.sendfile("./update.html"); 
});



app.get("/home",function(req,res){
	res.sendfile("./home.html");
});

});

app.get("/supervisor_loggedin",function(req,res){
	res.sendfile("./supervisor_loggedin.html"); 
	
	app.get("/addproducts",function(req,res){
	res.sendfile("./addproducts.html"); 
     });
	app.get("/updateprice",function(req,res){
	res.sendfile("./updateprice.html"); 
     });
	app.get("/manageqty",function(req,res){
	res.sendfile("./manageqty.html"); 
     }); 
		
	app.post("/addproducts" , function(req,res)	
	{
		var catalog= {
		SKU : req.body.sku, 
		Name : req.body.ProdName,
		Price: req.body.price,
		Vendor_ID: req.body.vendor
		}; 
	
	
	mysql.query("Insert into catalog (SKU,Name,Price,Vendor_ID) VALUES ('"+catalog.SKU+"','"+catalog.Name+"','"+catalog.Price+"','"+catalog.Vendor_ID+"') ; ",function(err, result)
    {
        if (err)
            throw err;
	else
	{
		console.log("insert into catalog success");
		res.redirect('/productattr');
	}
	
	});		
	});
		
	app.get("/productattr",function(req,res){
	res.sendfile("./productattr.html"); 
});


app.post("/productattr" , function(req,res)	
	{

		var product= {
		Product_ID : req.body.ProdID,
		SKU : req.body.sku, 
		Available_Qty : req.body.qty		
		}; 
		
		var product_attribute= {
		Product_ID	: req.body.ProdID,
		Attr_Name: req.body.attr1, 
		Attr_Value : req.body.Val1	
		}; 
		
		
		mysql.query("Insert into product (Product_ID,SKU,Available_Qty) VALUES ('"+product.Product_ID+"','"+product.SKU+"','"+product.Available_Qty+"') ; ",function(err, result)
		{
        if (err)
            throw err;
		else
		{
			console.log("insert into product success");
			mysql.query("Insert into product_attribute (Product_ID,Attr_Name,Attr_Value) VALUES ('"+product_attribute.Product_ID+"','"+product_attribute.Attr_Name+"','"+product_attribute.Attr_value+"') ; ",function(err, result)
		{
        if (err)
            throw err;
		else
		{
			console.log("insert into product_attribute success");
			res.send('Product added successfully !');
			
		} });	
			
		}
	
	});		
		
	});
		
	
	app.post("/updateprice" , function(req,res)	
	{
		
		var SKU =  req.body.sku; 
		var Price = req.body.price; 
	
	mysql.query("update catalog set Price = ?  where SKU = ? " , [Price,SKU] ,function(err, result)
    {
        if (err)
            throw err;
	else
	{
		console.log("update price to catalog success");
		res.send("update price to catalog success");
		
	}
	
	});		
	});
	
	app.post("/manageqty" , function(req,res)	
	{
		
		var Product_ID =  req.body.ProdID; 
		var Available_Qty = req.body.qty; 
	
	
	mysql.query("update product set Available_Qty = ?  where Product_ID = ? " , [Available_Qty,Product_ID] ,function(err, result)
    {
        if (err)
            throw err;
	else
	{
		console.log("update qty to product success");
		res.send("update qty to product success");
	}
	
	});		
	});
	
	
	
});

});

http.createServer(app).listen(3000);

