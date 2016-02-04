var express = require('express');
var app = express();
var path = require('path');
var fs = require('fs');
//app.use(express.static(__dirname + '/public'));

//serve login page
app.get('/', function (req, res) {
   console.log("Got a GET request for the homepage");
   res.sendFile(path.join(__dirname,'public/login.html'));
})

//serve main page
app.get('/main', function (req, res) {
   console.log("Got a GET request for the main");
   res.sendFile(path.join(__dirname,'public/main_page.html'));
})

//serve sample tab page page
app.get('/tabs', function (req, res) {
   console.log("Got a GET request for the tab");
   res.sendFile(path.join(__dirname,'public/tabs_w_alerts.html'));
})

//serve test
app.get('/asset/:path', function (req, res) {
   console.log("Got a GET request for the asset: " + req.params.path);
   console.log("Sending file: " + path.join(__dirname,'assets/',req.params.path+'.png'));
   res.sendFile(path.join(__dirname,'assets/',req.params.path+'.png'));
})

//Retrieve basic info (name + profile pic id) given a list fo users
app.get('/userset', function (req, res) {
  console.log("Got "+req.method+" userset request for set:" + req.query.users);

  

  var accJSN = JSON.parse(fs.readFileSync(path.join(__dirname,'/public/data/users.json')));
  accJSN = accJSN.users;

  var users = JSON.parse(req.query.users);

  var resJSN = new Array;

  for(var i=0;i<users.length;i++)
  {
    //build a simplified user object and add it to the response
    var temp = {};
    temp["id"] = users[i];
    temp["fName"] = accJSN[users[i]].fName;
    temp["lName"] = accJSN[users[i]].lName;
    temp["profilePic"] = accJSN[users[i]].profilePic; 
    resJSN.push(temp);
  }

  console.log("Sending: " + JSON.stringify(resJSN));
  
  res.setHeader('Content-Type', 'application/json'); 
  res.json(resJSN);

})


//Retrieve data elements from json storage
app.get('/data/:asset/:id', function (req, res) {

  console.log("Got "+req.method+" data request, asset: "+req.params.asset+" id: "+req.params.id);

  var accJSN

  res.setHeader('Content-Type', 'application/json');

  if(req.params.asset === "user")
  {
    //load profiles
    accJSN = JSON.parse(fs.readFileSync(path.join(__dirname,'/public/data/users.json')));

    //return profile with id num
    res.json(accJSN.users[req.params.id]);
  }
  else if(req.params.asset === "content")
  { 
    //load data 
    accJSN = JSON.parse(fs.readFileSync(path.join(__dirname,'/public/data/content.json')));

    if(req.params.id === "meta")
    {
      //return data metadata
      res.json(accJSN.meta);
    }
    else
    {
      //return data with id num
      res.json(accJSN.data[req.params.id]);
    }
    
  }
  else
  {
    console.log("Unknown Request!");
  }

 

})


/*
//test json data retrieve
app.get('/data/:path', function (req, res) {
  console.log("Got a GET request for the data");

  if (req.params.path === "getProfile")
  {
    console.log("Got data request "+req.params.path+" params: %j",req.query);

  }

  //req.query.id
  
  var accJSN

  res.setHeader('Content-Type', 'application/json');

  //accJSN = JSON.parse(fs.readFileSync(path.join(__dirname,'accounts.json')));
  accJSN = JSON.parse(fs.readFileSync(path.join(__dirname,'/public/data/users.json')));
  res.send(JSON.stringify(accJSN.users[req.query.id]));
})
*/

/*
// This responds a POST request for the homepage
app.post('/', function (req, res) {
   console.log("Got a POST request for the homepage");
   res.send('Hello POST');
})

// This responds a DELETE request for the /del_user page.
app.delete('/del_user', function (req, res) {
   console.log("Got a DELETE request for /del_user");
   res.send('Hello DELETE');
})

// This responds a GET request for the /list_user page.
app.get('/list_user', function (req, res) {
   console.log("Got a GET request for /list_user");
   res.send('Page Listing');
})

// This responds a GET request for abcd, abxcd, ab123cd, and so on
app.get('/ab*cd', function(req, res) {   
   console.log("Got a GET request for /ab*cd");
   res.send('Page Pattern Match');
})
*/

var server = app.listen(8081, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})