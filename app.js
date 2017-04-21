var http = require("http");
var express=require("express");
var session = require('express-session');
var app=express();
var mysql = require('mysql');
var fs = require('fs');
var path = require('path');
var format = require('dateformat');
var datetime = require('node-datetime');

var cron = require('cron');  // for subscription orders scheduling[shashank]
var server = http.createServer(app).listen(3000);    // initially this line was in last   WITHOUT LOAD BALANCING
var socketIO = require('socket.io').listen(server);     // to know how many connections are in realtime
//trying nested load-balancing
if (socketIO.sockets.clients.length % 3 == 0) {
    server = http.createServer(app).listen(3001);
    socketIO = require('socket.io').listen(server);
}
else if (socketIO.sockets.clients.length % 3 == 1) {
    server = http.createServer(app).listen(3002);
    socketIO = require('socket.io').listen(server);
}
else {
    server = http.createServer(app).listen(3003);
    socketIO = require('socket.io').listen(server);
}

var HOST = 'localhost';
var PORT = 3306;  // this port is not for the web-server(which is 3000 as can be seen above) but for the DB-server
var MYSQL_USER = 'root';
var MYSQL_PASS = 'GayuUtd@2016';
var DATABASE = 'ecommerce_project';
//var TABLE = 'user_entry';

//var _dirname = "E:\eCommerce_Proj";

var _dirname = "C:\Users\Gayathri\Documents\eCommerce_Proj"

var mysql = mysql.createConnection({
    host: HOST,
    port: PORT,
    user: MYSQL_USER,
    password: MYSQL_PASS,
    database: DATABASE
});


app.use(express.bodyParser());
app.use('/',  express.static(__dirname + '/'));
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(session({cookieName: 'session',secret: 'ssshhhhh', saveUninitialized: true, resave: true}));	
app.use(app.router);
	
var sess;
var user_id;
var tset_minutes = 0; // for traffic analysis purpose
var tset_hours = 3;
var tset_string;
var tset_string2;
var connectCounter = 0;
var value_setter = 0;



app.get("/home",function(req,res){
	sess = req.session;
    res.sendfile("./home.html");
    console.log("Process ID "+process.pid+" on port:"+server.address().port);   // to proove load balancing[shashank]
	
	app.get("/Shirts",function(req,res){

		res.sendfile("./shirts.html");
       
	    app.get("/shirtsLoad",function(req,res){
	        console.log("user id to cart" +user_id +sess.user_id);
	        mysql.query('select a.SKU, b.Product_ID, a.Name, a.Price, b.Available_Qty, c.Attr_Name, c.Attr_Value from catalog a, product b, product_attribute c where a.sku=b.sku and b.product_id=c.product_id;', function(err, rows, fields)
	        {       
			    if (err)
	                throw err;
		        else
	            {
	            	res.type('text/plain');
					res.json(rows);
			        res.end(); 
	            } 
			});
		});
		
	    app.post("/addProductsToCart",function(req,res){
		    var checked=req.body.addToCartCheck;
			var qty = req.body.purchaseQty; 
			
			var getPrice = function(index) //index is not defined anywhere because it's automatically defined by initialization way
			{
                if (index == checked.length)
                {
                    console.log("loop done");
			    }	
			    else
			    {
				    var checked_product = checked[index];
					console.log("selected check box now" +checked_product );
					var product_qty = qty[0];
					console.log("purchaseQty" + product_qty);
					var product_price;
					console.log("check loop1");
					
					mysql.query("select Price from catalog where SKU = (select SKU from product where Product_ID= ?)", [checked_product], function(err, result, fields)
					{
					    if (err)		
						    throw err;
					    else
					    {	
					        console.log("check loop2");
					        console.log("result" +result);					
					        product_price = result[0].Price;
					        console.log("product_price"+product_price);
					        var price= eval(product_price*product_qty);
					        console.log("tot price" +price);	
					        var cart= {
					            UID : user_id, 
					            Product_id : checked_product,
					            QTY: product_qty,
					            Tot_Price: price,
					            Active_Flag : "active"
					        }; 
				            console.log(cart.UID+" "+cart.Product_id+" "+cart.QTY+" "+cart.Tot_Price+" "+cart.Active_Flag);				
				            mysql.query("Insert into cart (UID,Product_id,QTY,Tot_Price,Active_Flag) VALUES ('"+cart.UID+"','"+cart.Product_id+"','"+cart.QTY+"','"+cart.Tot_Price+"','"+cart.Active_Flag+"') ; ",function(err, result)
				            {
					            if (err)
						            throw err;
				                else
				                {
					                console.log("insert into cart success");
				                }
				            });
				        }
				        getPrice(index +1);	//looping is done using recursion
					});	
		        }
			} //getPrice() ends
			getPrice(0);  // expoiting the feature of get request which first parse through the whole code in it	
            res.send('added to cart successfully')   
        });  // app.post("/addProductsToCart") ends here
    }); //app.get("/shirts") ends here
	
	app.get("/displayCart",function(req,res){ 

		res.sendfile("./displayCart.html");
       
	    app.get("/displayCartLoad",function(req,res){
	        mysql.query('SELECT * FROM cart where uid = ? ' , [user_id], function(err,rows){
	            if (err)
	                throw err;
		        else
	            {
				    console.log('no of products in cart '+rows.length);
				    res.type('text/plain');
					res.json(rows);
	                res.end();
			    }
	    	});  
		});// results of displaying cart done 
	 
	    app.get("/proceedToCheckout" , function(req,res){

	    	res.sendfile("./proceedToCheckout.html");

	    	app.get("/proceedToCheckout",function(req,res){
		        mysql.query('SELECT * FROM address where uid = ? ' , [user_id], function(err,rows)
            	{
	                if (err)
	                    throw err;
		            else
	                {
				        console.log('no of adress for the user '+rows.length);
				        res.type('text/plain');
						res.json(rows);
	                    res.end();
			        }
	        	});	//available addresses displayed 
			});
	        
	    });

	    app.post("/proceedToPayment" , function(req,res){
			var addr_selected=req.body.addr_id_radio;
			console.log("selected address" +addr_selected);
	        var order_amount;
	        var order_id;
	        var state_tax;
	        var amount_payable;
	        var bill_no;

	    	res.sendfile("./proceedToPayment.html");

	    	app.get("/proceedToPaymentLoad",function(req,res){
	    					mysql.query("select sum(tot_price)as amount from cart where UID = ?", [user_id], function(err, result, fields)
	    					{
	    					    if (err)		
	    						    throw err;
	    						else
	    						{					
	    							order_amount = eval(result[0].amount);
	    							console.log("result" +order_amount);
	    					        var order={
	    							    UID: user_id,
	    							    Purchase_Amt : order_amount, 
	    							    Delivery_Addr_ID : addr_selected,
	    							    Order_Status : "initiated",
	    							    Return_Flag : "no"
	    							}; 
	    					        mysql.query("Insert into order (UID,Order_Date,Purchase_Amt,Delivery_Addr_ID,Order_Status,Return_Flag) VALUES ('"+order.UID+"', NOW(),'"+order.Purchase_Amt+"','"+order.Delivery_Addr_ID+"','"+order.Order_Status+"','"+order.Return_Flag+"') ; ",function(err, result)
	    						    {
	    							    if (err)
	    								    throw err;
	    						        else
	    						        {
	    							        console.log("insert into order success");
	    						            var default_status = "initiated";	
	    						            mysql.query("select Order_ID from order where UID = ? and Order_Status = ?", [user_id,default_status], function(err, result, fields)
	    							        {
	    							            if (err)
	    								            throw err;
	    							            else
	    							            {
	    							                order_id = result[0].Order_ID
	    							                console.log("order_id" +order_id);
	    							                mysql.query("insert into line_items (Order_ID, Seq_num, Product_ID, QTY, Price) select Order_ID , @n:=@n+1 as seq_num , product_id , qty, Tot_Price from (select product_id , qty, Tot_Price from cart where UID = ?) a ,(SELECT @n:=0) b , (select Order_ID from ecommerce_project.order where Order_ID=?) c ; ", [user_id,order_id], function(err, result, fields)
	    							                {
	    							                    if (err)
	    								                    throw err;
	    							                    else
	    							                    {
	    								                    console.log("insert into line items success");
	    								                    mysql.query("select Tax_Percent from Tax_Info where State_Code = (select state from address where addr_id = ?)", [addr_selected], function(err, result, fields)
	    							                        {
	    							                            if (err)
	    								                            throw err;
	    							                            else
	    							                            {
	    								                            state_tax=result[0].Tax_Percent;
	    								                            console.log("state_tax" +state_tax);
	    								                            var tax_amount = eval(order_amount*state_tax/100);
	    								                            amount_payable = eval(order_amount + tax_amount);
	    								                            console.log("amount_payable" +amount_payable);
	    							                                var bill={
	    							                                    Order_ID : order_id, 
	    							                                    Purchase_Amt : order_amount,
	    							                                    Taxable_Amt : tax_amount,
	    							                                    Payable_Amount: amount_payable
	    							                                }; 
	    							                                mysql.query("Insert into bill (Order_ID,Purchase_Amt,Taxable_Amt,Payable_Amount) VALUES ('"+bill.Order_ID+"','"+bill.Purchase_Amt+"','"+bill.Taxable_Amt+"','"+bill.Payable_Amount+"') ; ",function(err, result)
	    							                                {
	    							                                    if (err)
	    								                                    throw err;
	    							                                    else
	    							                                    {
	    							                                        console.log("insertion into bill success");	
	    							                                    }
	    							                                    mysql.query('SELECT * FROM bill where Order_ID = ? ' , [order_id], function(err,rows)
	    							                                    {
	    							                                        if (err)
	    							                                            throw err;
	    							                                        else
	    							                                        {
	    							                                        	res.type('text/plain');
	    							                                        	res.json(rows);
	    		                                            					res.end();
	    							                                        }
	    							                                    });	
	    							
	    							                                });
	    							                            }
	    							                        });
	    							                    }
	    							                });
	    							            }
	    						            });
	    						        }
	    						    });
	    						}	
	    					});
			});// results of displaying proceedToPayment done

	        
	        
			
							
	        app.post("/confirmPayment" , function(req,res){
	            var PayMode = req.body.paymentMode;
		        var payment={
				    Bill_no : bill_no, 
					Payable_Amount: amount_payable,
					Payment_Mode : PayMode
				}; 
				var order_status = "Ordered";

				mysql.query("Insert into Payment (Bill_no,Payable_Amount,Payment_Mode,Payment_Date) VALUES ('"+payment.Bill_no+"','"+payment.Payable_Amount+"','"+payment.Payment_Mode+"',NOW()) ; ",function(err, result)
				{
					if (err)
						throw err;
					else
					{
					    console.log("insert into payment success");	
						mysql.query("update order set Order_Status = ?  where Order_ID = ? ", [order_status,order_id],function(err, result)
						{
							if (err)
								throw err;
							else
							{
								console.log("order success");		
								mysql.query("delete from cart where UID = ? ", [user_id],function(err, result)
							    {
							        if (err)
								        throw err;
							        else
							        {
								        console.log("items deleted from cart");	
							            mysql.query("insert into shipment (Order_ID,Product_ID) select Order_ID , Product_ID from line_items where Order_ID=? ",[order_id],function(err, result)
							            {
							                if (err)
								                throw err;
							                else
							                {
								                console.log("insert into shipment success");
							                }
							            });	
								        res.send("Order placed Successfully");
							        }
							    });
							}
						});
					}
			    });
	        });// results of displaying confirmPayment done
	    });
	});//app.get("/displayCart") ends here
	
	app.get("/form",function(req,res){
	    res.sendfile("./form.html");  
	});
	
	app.get("/signup",function(req,res){
	    res.sendfile("./signup.html"); 
    });

    app.post("/form",function(req,res)
    {
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
	            user_id=rows[0].cid;
	            console.log("user_name" +user_name + "role" +role) ;	
	            if( pswd == user_entry.pass_word)
	            {
		            sess.username = uname;
		            sess.user_id  = user_id;
	                console.log("login success" +role + "session name" +sess.username);
		            if( role == "customer")
			        {
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
	                            mysql.query("Insert into address (uid,Addr_line1,Addr_line2,state,zip_code) values ('"+uid+"','"+Addr_line1+"','"+Addr_line2+"','"+state+"','"+zip_code+"');", function(err, result)
                                {
                                    if (err)
                                        throw err;
                                    console.log("sign up success");
	                            });
	                        }
	                    });
                    }
                });
            }
        });
        res.send('Invalid login');    //Probably shouldn't be here
    });

    app.get("/customer_loggedin",function(req,res){
	    res.sendfile("./customer_loggedin.html");
 	    app.get("/userOrderHistory",function(req,res){
 	    	res.sendfile("./userOrderHistory.html");

 	    	app.get("/userOrderHistoryLoad",function(req,res){
 	    	                    mysql.query('select b.Order_ID, b.Seq_num, b.Product_ID, b.QTY, b.Price, a.order_date, a.Order_Status ,a.Return_Flag from ecommerce_project.order a, line_items b where (a.Order_ID=b.Order_ID) and (a.Return_Flag="NO") and (a.UID=?)',[user_id], function(err, rows, fields)
 	    	        			{
 	    	        	            if (err)
 	    	        	                throw err;
 	    	        	            else
 	    	        	            {
 	    	        	                console.log('no of records is '+rows.length);
 	    	        	                res.type('text/plain');
										res.json(rows);
 	    	        	                res.end();
 	    	        	            }
 	    	        	        }); 
 	    	});// results of displaying cart done 

	        app.post("/customerReturns" , function(req,res)
	        {
                var checked=req.body.returnItems;
                var temp = function(index)
                {
                    if(index==checked.length){
                        console.log("loop done");
                    }
                    else
                    {
                        var checked_product = checked[index];
                        console.log("selected check box now" +checked_product );
                        //console.log("check loop1");
			            var flag_yes = "yes"
                        mysql.query("update order set Return_Flag=? where Order_ID=?)", [flag_yes,checked_product], function(err, result, fields)
                    {
                        if (err)
                            throw err;
                        else
                        {
                            console.log("check loop2");
                            console.log("result" +result);
                        }
                        temp(index +1);
                    });
                    }
                }
                temp(0);
                res.send('return initiated for the selected item(s)');
	        });
        });

        app.get("/update",function(req,res){
	        res.sendfile("./update.html"); 
        });

        app.get('/profileLoad', function(req, res) {
        	 connection.query("select * from customer inner join (address inner join user_entry on address.uid = user_entry.uid) on customer.uid = address.uid where customer.uid=" + user_id + ";", function(err, rows, fields) {
        	   	if (!err){
        		   	res.type('text/plain');
        			res.json(rows);
            	}
           		else
             		console.log('Error while performing Query.');
         	});	
        });

        app.get("/home",function(req,res){
	        res.sendfile("./home.html");
        });
		app.get("/subscribe", function (req, res){ 
        	res.sendfile("./subscribe.html");
			
			app.get("/subscribeLoad",function(req,res){
				        mysql.query('SELECT * FROM address where uid = ? ' , [user_id], function(err,rows){
				            if (err)
				                throw err;
					        else
				            {
							    console.log('no of adress for the user '+rows.length);
							    res.type('text/plain');
								res.json(rows);
				                res.end();
						    }
				    	});  
					});// results of displaying subscribe done 
    	});
	
		app.post("/subscribe", function (req, res){ 
		
			var sub_date = new Date();
			var freq = req.body.Frequency; 
			var product_id = req.body.productid; 
			var sku = (product_id+"").slice(0,-4);
			var sub_qty = req.body.qty; 
			var sub_addr_id = req.body.addr_id_radio; 
			console.log("sliced SKU" +sku + "qty" +sub_qty + "addr" +sub_addr_id );
			
			//sub_date.addDays(freq);
			//sub_date.setDate(sub_date.getDate() + freq);
			var new_date = new Date(sub_date.setTime( sub_date.getTime() + freq * 86400000 ));
			var day=format(new_date, "yyyy-mm-dd h:MM:ss");
			console.log(" date addition " +day);
			var now = format( new Date(), "yyyy-mm-dd"); 
		
        	var template= {
			    UID: user_id,
				product_id : req.body.productid,
				qty : sub_qty,
			    Frequency: req.body.Frequency,		   
			    Next_Order_Date : day,
				addr_id : sub_addr_id 
				}; 
			
			
	        mysql.query("Insert into subscription_template (UID,Subscribed_Date,Frequency,product_id,qty,Next_Order_Date,addr_id) VALUES ('"+template.UID+"',NOW(),'"+template.Frequency+"','"+template.product_id+"','"+template.qty+"','"+template.Next_Order_Date+"', '"+template.addr_id+"' ) ; ",function(err, result)
            {
                if (err)
                    throw err;
	            else
	            {
		            console.log("insert into subscription successful");
					
		            res.send('insert to subscription_template success.');
	            }});  
    	});
	
    });

    app.get("/supervisor_loggedin",function(req,res){
	    res.sendfile("./supervisor_loggedin.html"); 
	
	    app.get("/addproducts",function(req,res){
	        res.sendfile("./productList.html");

	        app.get('/productLoad',function(req,res){
	        	connection.query("SELECT * from  catalog;", function(err, rows, fields) {
	        	   	if (!err){
	        	   		var objs = [];
	        	   		for (var i = 0;i < rows.length; i++) {
	        	   		    objs.push({product_name:rows[i].Name,SKU:rows[i].SKU,Price:rows[i].Price,Vendor_ID:rows[i].Vendor_ID});
	        	   		}
	        	   		res.end(JSON.stringify(objs));
	            	}
	           		else
	             		console.log('Error while performing Query.123');
	         	});	
	        })

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
                        }
                    });
		        }
	        });
	    });

        app.get("/updateprice", function (req, res){
	        res.sendfile("./updateprice.html"); 
        });
        
        app.get("/manageqty", function (req, res){
	        res.sendfile("./manageqty.html"); 
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
	
	    app.get("/viewOrders",function(req,res){

	    	res.sendfile("./viewOrders.html");

	    	app.get("/viewOrdersLoad",function(req,res){
	    		        	        mysql.query('select b.Order_ID, b.Seq_num, b.Product_ID, b.QTY, b.Price, a.order_date, a.Order_Status ,a.Return_Flag from ecommerce_project.order a, line_items b where a.Order_ID=b.Order_ID;', function(err, rows, fields)
	    		                    {       
	    		        		        if (err)
	    		                            throw err;
	    		        	            else
	    		                        {
	    		        		            console.log('no of records is '+rows.length);
	    		                            res.type('text/plain');
	    		                            res.json(rows);
	    		                            res.end();
	    		                        } 
	    		        	        }); 
	    			});// results of displaying viewOrders done 
	    });
	
		app.get("/updateShipments",function(req,res){	

			res.sendfile("./updateShipments.html");
			app.get("/displayCartLoad",function(req,res){
				        mysql.query('select * from shipment', function(err, rows, fields){
				            if (err)
				                throw err;
					        else
				            {
							    console.log('no of records is '+rows.length);
							    res.type('text/plain');
								res.json(rows);
				                res.end();
						    }
				    	});  
			});// results of displaying cart done 
		    app.post("/shipStatus",function(req,res){
				var checked=req.body.shipmentUpdate;
				var shipState= req.body.shipStatus; 
				var statusUpdate = function(index)
				{
					if(index==checked.length){
					    console.log("loop done");
					}	
					else
					{
					    var checked_shipment = checked[index];
					    console.log("selected check box now" +checked_shipment );
					    mysql.query("update shipment set Ship_Status = ? where Shipment_ID = ?", [shipState,checked_shipment],function(err, result, fields)
					    {										
					        if (err)		
						        throw err;
					        else
					            console.log("shipment status update success");								 				      
					    });
				        statusUpdate(index +1);	
					}	
					
					
				}
				statusUpdate(0);
                res.send('ship status updated successfully');  
            });
	    });
    });

    
    //node-cron used below
    //It means as soon as my server runs and is running, it'll check if there are any scheduled tasks to run
    //the task is to auto-order the subscription orders
    //below cron_job will execute everyday at 04:00:00 am in the morning when the load on server is assumed to be least
    /*PRE-REQUISITES
     * 1.subscription table already created
     * 2.subscription_cart table already created
    */
    var execution_time = "00 00 03";
    
    var cron_job0 = cron.job("00 */2 * * * *", function () {
		var now = new Date();
		var hour = now.getHours();
		console.log("message on "+now);
		
        if (hour >= 3 && value_setter==0) {
            if (tset_minutes <= 54) {
                tset_minutes += 5;
            }
            else {
                tset_minutes = 0;
                if (tset_hours <= 22) {
                    tset_hours += 1;
                }
                else {
                    tset_hours = 0; 
                }
            }
            if (tset_minutes % 10 !== 0) {
                tset_string = tset_minutes.toString();
            }
            else { 
                tset_string="0"+ tset_minutes.toString();
            }
            if (tset_hours > 3 && tset_hours % 10 !== 0) {
                tset_string2 = tset_hours.toString();
            }
            else { 
                tset_string2 = "0" + tset_hours.toString();
            }
            execution_time = "00 " + tset_string + " " + tset_string2;
        }
    });
    cron_job0.start();

    connectCounter = socketIO.sockets.clients.length;
    
    var cron_job = cron.job(execution_time + " * * *", function () {
        //making sure that the server is not heavily loaded
        if (connectCounter < 101) {
            value_setter = 1;s
			
			var today_date = format( new Date(), "yyyy-mm-dd"); 
				var tomo = new Date(now.setTime( now.getTime() + 1 * 86400000 ));
				var tomo_date = format(tomo, "yyyy-mm-dd");
				console.log("tomo date" +tomo_date);
				
						mysql.query('SELECT * FROM subscription_template where Next_Order_Date like ? ', '%' + tomo_date + '%', function(err,rows)
						{
						if (err)
							throw err;
						else
						{
							for(i=0;i<rows.length;i++)
							{
								var sub_id = rows[i].Subcription_ID;
								var nod = rows[i].Next_Order_Date; 
								var freq = rows[i].Frequency; 
								var product_id = rows[i].product_id; 
								var sku = (product_id+"").slice(0,-4);
								var sub_qty = rows[i].qty; 
								var sub_addr_id = rows[i].addr_id; 
								var sub_user = rows[i].UID;
								var next_order_date = format(nod, "yyyy-mm-dd");
								if (tomo_date == next_order_date)
								{
								console.log("process order automatically");
								
			var order_amount;
	        var order_id;
	        var state_tax;
	        var amount_payable;
	        var bill_no;
			mysql.query("select Price from Catalog where SKU = ?", [sku], function(err, result, fields)
			{
			    if (err)		
				    throw err;
				else
				{	
					var price = result[0].Price; 
					order_amount = eval(price *sub_qty);
					console.log("amt" +order_amount);
			        var order={
					    UID: sub_user,
					    Purchase_Amt : order_amount, 
					    Delivery_Addr_ID : sub_addr_id,
					    Order_Status : "initiated",
					    Return_Flag : "no"
					}; 
			        mysql.query("Insert into ecommerce_project.order (UID,Order_Date,Purchase_Amt,Delivery_Addr_ID,Order_Status,Return_Flag) VALUES ('"+order.UID+"', NOW(),'"+order.Purchase_Amt+"','"+order.Delivery_Addr_ID+"','"+order.Order_Status+"','"+order.Return_Flag+"') ; ",function(err, result)
				    {
					    if (err)
						    throw err;
				        else
				        {
					        console.log("subscription: insert into order success");
				            var default_status = "initiated";	
				            mysql.query("select Order_ID from ecommerce_project.order where UID = ? and Order_Status = ?", [sub_user,default_status], function(err, result, fields)
					        {
					            if (err)
						            throw err;
					            else
					            {
					                order_id = result[0].Order_ID
					                console.log("order_id" +order_id);
					                mysql.query("insert into line_items (Order_ID, Seq_num, Product_ID, QTY, Price) select Order_ID , @n:=@n+1 as seq_num , product_id , qty, Tot_Price from (select ? as Order_ID, ? as product_id , ? as qty, ? as Tot_Price) a ,(SELECT @n:=0) b ; ", [order_id,product_id,sub_qty,order_amount], function(err, result, fields)
					                {
					                    if (err)
						                    throw err;
					                    else
					                    {
						                    console.log("subscription: insert into line items success");
						                    mysql.query("select Tax_Percent from Tax_Info where State_Code = (select state from address where addr_id = ?)", [sub_addr_id], function(err, result, fields)
					                        {
					                            if (err)
						                            throw err;
					                            else
					                            {
						                            state_tax=result[0].Tax_Percent;
						                            console.log("state_tax" +state_tax);
						                            var tax_amount = eval(order_amount*state_tax/100);
						                            amount_payable = eval(order_amount + tax_amount);
						                            console.log("amount_payable" +amount_payable);
					                                var bill={
					                                    Order_ID : order_id, 
					                                    Purchase_Amt : order_amount,
					                                    Taxable_Amt : tax_amount,
					                                    Payable_Amount: amount_payable
					                                }; 
					                                mysql.query("Insert into bill (Order_ID,Purchase_Amt,Taxable_Amt,Payable_Amount) VALUES ('"+bill.Order_ID+"','"+bill.Purchase_Amt+"','"+bill.Taxable_Amt+"','"+bill.Payable_Amount+"') ; ",function(err, result)
					                                {
					                                    if (err)
						                                    throw err;
					                                    else
					                                    {
					                                        console.log("Subscription: insert into bill success");	
					                                    }
					                                    mysql.query('SELECT * FROM bill where Order_ID = ? ' , [order_id], function(err,rows)
					                                    {
					                                        if (err)
					                                            throw err;
					                                        else
					                                        {
                                            					bill_no=rows[0].Bill_no;

														var PayMode = "Credit Card";
														var payment={
															Bill_no : bill_no, 
															Payable_Amount: amount_payable,
															Payment_Mode : PayMode
														}; 
														var order_status = "Ordered";
														mysql.query("Insert into Payment (Bill_no,Payable_Amount,Payment_Mode,Payment_Date) VALUES ('"+payment.Bill_no+"','"+payment.Payable_Amount+"','"+payment.Payment_Mode+"',NOW()) ; ",function(err, result)
														{
															if (err)
																throw err;
															else
															{
																console.log("Subscription: insert into payment success");	
																mysql.query("update ecommerce_project.order set Order_Status = ?  where Order_ID = ? ", [order_status,order_id],function(err, result)
																{
																	if (err)
																		throw err;
																	else
																	{
																		console.log("Subscription: order success");		
																			mysql.query("insert into subscription_order (Subcription_ID,Order_ID) select Subcription_ID, ? as Order_ID from subscription_template  where UID=? and product_id=? ",[order_id,sub_user,product_id],function(err, result)											
																			{
																					if (err)
																						throw err;
																					else
																						{
																							console.log("Subscription: insert into subscription order success");
																							mysql.query("insert into shipment (Order_ID,Product_ID) select Order_ID , Product_ID from line_items where Order_ID=? ",[order_id],function(err, result)																			
																							{																				
																							if (err)																				
																								throw err;																		
																							else	
																							{	console.log("Subscription: insert into shipment success");	
																								console.log("existing nod" +nod +"freq" +freq + "sub id" +sub_id);	
																								var new_nod = new Date(nod.setTime( nod.getTime() + freq * 86400000 ));
																								var nod_update=format(new_nod, "yyyy-mm-dd h:MM:ss");
																								console.log("nod update"+new_nod + "   " +nod_update) ;
																								mysql.query("update subscription_template set Next_Order_Date = ?  where subcription_ID = ? ", [nod_update,sub_id],function(err, result)
																									{
																									if (err)
																									throw err;
																									else
																									console.log("Subscription process success");
																									});
																								
																							}
																							});
																						}

																			});	
																																									
																			
																					
																				
																		 
																	}
																});
															}
															});

					                                            
																
					                                        }
					                                    });	
					
					                                });
					                            }
					                        });
					                    }
					                });
					            }
				            });
				        }
				    });
				}	
			});
		}
	else{
	console.log("no subscription orders to process")
	}
	}
}
});
    }
    });
    cron_job.start();
});


