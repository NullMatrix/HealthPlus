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

app.get('/visitUser', function (req, res) {
  //request params need to include:
  //fromUser - user id of the user initiating the visit
  var fromUser = parseInt(req.query.from);
  //toUser - the user who's data is being viewed
  var toUser = parseInt(req.query.to);

  //generate permission intersect
    
    //create distinct list of tags using circle memberships and fromUser id

  var userPermissions = [];

  //toUser circle info pulled from all accounts
  var userAccts = JSON.parse(fs.readFileSync(path.join(__dirname,'/public/data/users.json')));
  var circles = userAccts.users[toUser].circles;

  //generate list of tags from user has access to see on to user
  for(c in circles)
  {
    if(circles[c].members.indexOf(fromUser)>=0)
    {
      for(i=0;i< circles[c].tags.length;i++)
      {
        if(userPermissions.indexOf(circles[c].tags[i])<0)
        {
          userPermissions.push(circles[c].tags[i]);
        }
      } 
    }
  }


  //pull toUser content
  var userContent = JSON.parse(fs.readFileSync(path.join(__dirname,'/public/data/content.json')));
  userContent = userContent.data[toUser];

    
  //function to remove data which from user does not have access to
  var trim = function(data, permissions)
  {
    var access = false;
    //get intersect between permissions and data tags
    for(i=0;i<permissions.length;i++)
    {
      if(data.tags.indexOf(permissions[i])>=0)
      {
        access = true;
        break;
      }
    }

    //if no intersect return null
    if(!access)
    {
      return null;
    }

    //if leaf type return data
    if(data.type != "collection")
    {
      return data;
    }

    //declare empty recur array
    var newContent = [];

    //for each in data.content
    for(j=0;j<data.content.length;j++)
    {
      //recur with content
      var tmp = trim(data.content[j],permissions);
      //if recur does not return null
      if(tmp)
      {
        //add id to node
        tmp["id"]=j;
        //push node to recur array
        newContent.push(tmp);
      }
    }

    //set data.content to recur array
    data.content = newContent;
    return data;
  }

  var returnContent = [];

  //for each content
  for(k=0;k<userContent.length;k++)
  {
    //add the id to the content
    userContent[k]["id"]=k;
    //trim the content
    var tmp = trim(userContent[k],userPermissions);

    //if trimmed content is not null add to return object
    if(tmp)
    {
      returnContent.push(tmp);
    }

  }

  //send content
  res.setHeader('Content-Type', 'application/json');
  res.json(returnContent);


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