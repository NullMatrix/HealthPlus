var express = require('express');
var app = express();
var path = require('path');
var fs = require('fs');
var strDistance = require('jaro-winkler');
//app.use(express.static(__dirname + '/public'));

//JSON files, loaded at start and periodically written back to file.
var userData;
var userMeta;
var contentData;
var contentMeta;


/************************
*   Routing Functions   *
*************************/

//serve login page
app.get('/', function (req, res) {
   //console.log("Got a GET request for the homepage");
   res.sendFile(path.join(__dirname,'public/login.html'));
})

//serve main page
app.get('/main', function (req, res) {
   //console.log("Got a GET request for the main");
   res.sendFile(path.join(__dirname,'public/main_page.html'));
})


//serve test
app.get('/asset/:path', function (req, res) {
   //console.log("Got a GET request for the asset: " + req.params.path);
   //console.log("Sending file: " + path.join(__dirname,'assets/',req.params.path+'.png'));
   res.sendFile(path.join(__dirname,'assets/',req.params.path+'.png'));
})

//Retrieve basic info (name + profile pic id) given a list fo users
app.get('/userset', function (req, res) {
  //console.log("Got "+req.method+" userset request for set:" + req.query.users);
  
  var userDataClone = JSON.parse(JSON.stringify(userData));

  var users = JSON.parse(req.query.users);

  var resJSN = new Array;

  for(var i=0;i<users.length;i++)
  {
    //build a simplified user object and add it to the response
    var temp = {};
    temp["id"] = users[i];
    temp["fName"] = userDataClone[users[i]].fName;
    temp["lName"] = userDataClone[users[i]].lName;
    temp["profilePic"] = userDataClone[users[i]].profilePic; 
    resJSN.push(temp);
  }

  
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
    //return profile with id num
    res.json(userData[req.params.id]);
  }
  else if(req.params.asset === "content")
  { 

    if(req.params.id === "meta")
    {
      //return data metadata
      res.json(contentMeta);
    }
    else
    {
      //return data with id num
      res.json(contentData[req.params.id]);
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
  var circles = JSON.parse(JSON.stringify(userData[toUser].circles));

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


  //clone toUser content 
  userContent = JSON.parse(JSON.stringify(contentData[toUser]));

  var returnContent = [];

  //for each content
  for(k=0;k<userContent.length;k++)
  {
    //add the id to the content
    userContent[k]["id"]=k;
    //trim the content
    var tmp = trimData(userContent[k],userPermissions);

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

//route to return sorted list of friend ids based on query string
//Query Params
//userID - user requesting sorted list
//queryString - search string
app.get('/searchPeople', function (req, res) {

  //request params
  var queryString = req.query.queryString;
  var userID = parseInt(req.query.userID);

  var friends = userData[userID].friends;

  var jwResults = new Array();

  for(i=0;i<friends.length;i++)
  {
    //generate id + jw score object
    var tmp = {};
    tmp.id = friends[i];
    tmp.score = strDistance(queryString, userData[friends[i]].fName+" "+userData[friends[i]].lName);
    jwResults.push(tmp);
    
    //sort new score into result list
    for(j=jwResults.length-1;j>0;j--)
    {
      if(jwResults[j].score > jwResults[j-1].score)
      {
        var swap = jwResults[j];
        jwResults[j] = jwResults[j-1] 
        jwResults[j-1] = swap;
      }
      else{break;}
    }

  }

  //generate return array 
  var finalResult = new Array();
  for(k=0;k<jwResults.length;k++)
  {
    finalResult[k] = jwResults[k].id;
  }

  res.setHeader('Content-Type', 'application/json');
  res.json(finalResult);

})

//recursively search user's data and return best matching data elements
//Query Params
//queryString - search string
app.get('/searchData', function (req, res) {

  var maxResults = 5;
  //result list, preloaded with 0 value objects
  var topScore = [];
  for(i=0;i<maxResults;i++){topScore.push({id:-1,jw:0});}

  var id = 0; //incrementing id counter 
  var queryString = req.query.queryString;

  //data to be searched from specified user (cloned from global)
  var searchUserData = JSON.parse(JSON.stringify(contentData[req.query.userID]));
  //array to hold data with id for return
  userDatawID = new Array();


  //stack to hold data being sorted
  var stack = new Array();

  //put all top level data into stack
  for(d in searchUserData)
  {
    searchUserData[d]["id"]= id;
    id++;
    stack.push(searchUserData[d]);
  }

  while(stack.length>0)
  {
    var curData = stack.pop();
    userDatawID[curData.id]= curData;
    var curScore = 0;

    if(curData.type == "map" || curData.type == "image")
    {
      //jw on the title
      curScore = strDistance(queryString, curData.title);

    }
    else if(curData.type == "text")
    {
      curScore = maxJWScore(queryString, curData.title, curData.content);

    }
    else if(curData.type == "collection")
    {
      //add content to stack
      for(i=0;i<curData.content.length;i++)
      {
        curData.content[i]["id"]= id;
        id++;
        stack.push(curData.content[i])
      }
    }
    //currently journal is unimplemented

    //push new item score onto array
    topScore.push({id:curData.id,jw:curScore});

    //sort new value into array
    for(k=topScore.length-1; k>0; k--)
    {
      if(topScore[k].jw > topScore[k-1].jw)
      {
        var tmp = topScore[k-1];
        topScore[k-1] = topScore[k];
        topScore[k] = tmp;
      }
      else{break;}
    }
    
    //trim the list 
    topScore = topScore.slice(0,maxResults);

  }//end stack loop

  //generate result array
  var results = [];
  for(j=0; j<maxResults;j++)
  {
    results[j] = userDatawID[topScore[j].id];
  } 
  //console.log(topScore);

  
  res.setHeader('Content-Type', 'application/json');
  res.json(results);
})

//route for adding a new tag to an acct. Can be done without editing acct info
app.post('/newTag', function (req, res) {
  console.log("new tag POST with tag:"+req.query.newTag+" to user:"+req.query.userID);

  var load = JSON.parse(fs.readFileSync(path.join(__dirname,'/public/data/users.json')));
  var tags = load.users[req.query.userID].tags;

  //Ensure not adding duplicate tags
  for(i=0;i<tags.length;i++)
  {
    if(tags[i]===req.query.newTag)
    {
      res.send('<p>Transaction failed, tag exists.</p>');
      return
    }
  }

  //commit changes and reload local assets

  load.users[req.query.userID].tags.push(req.query.newTag);

  var writeString = JSON.stringify(load, null, 2);

  fs.writeFile(path.join(__dirname,'/public/data/users.json'), writeString, loadUsers());

  res.send('<p>Transaction complete!</p>');
})

//function to update a user's circle to a modified state provided
app.post('/updateCircle', function (req, res) {
  console.log("POST update circle");

  var load = JSON.parse(fs.readFileSync(path.join(__dirname,'/public/data/users.json')));
  
  var name = req.query.cirName;
  var members = JSON.parse(req.query.cirMembers);
  var tags = JSON.parse(req.query.cirTags);

  var oldCir = load.users[req.query.userID].circles[name]

  //@TODO: Allow user to select image
  //Assign default image to new circles
  var image = "bone";
  if(oldCir !== undefined){image = oldCir.image;}

  //@TODO: Allow user to select image for new circles
  var newCir = {"tags":tags,"members":members,"image": image};


  //commit changes and reload local assets
  load.users[req.query.userID].circles[name] = newCir;

  
  var writeString = JSON.stringify(load, null, 2);

  fs.writeFile(path.join(__dirname,'/public/data/users.json'), writeString, loadUsers());
  
  res.send('<p>Transaction complete!</p>');
  
})


/*
app.get('/search/:querystring', function (req, res) {
  //strDistance(str1, str2)

  
    //Provide search results of strings that match above some jaro threshhold
    //3 matching categories
         //-Circles (possibly pull related tags from this)
         //-Friends (authorized users you have put in at least one circle)
         //-Friends of friends (people in another user's circle that includes you.)

    //basic search
    //pull list of circles
    //pull list of users in currently defined circles

  

  var userAccts = JSON.parse(fs.readFileSync(path.join(__dirname,'/public/data/users.json')));
  userAccts = userAccts.users;

  var searchUser = parseInt(req.query.userID);

  var returnContent = {}
  var dis = strDistance(req.params.querystring, "Ryan Habibi")

  returnContent["test_score"] = dis

  var circleMatches = {}
  for(c in userAccts[searchUser].circles)
  {
    var tmpScore = strDistance(req.params.querystring,c)
    circleMatches[c]=tmpScore;

  }
  returnContent["circle_score"] = circleMatches;

  var friendList = generateFriendList(searchUser,userAccts)
  var fOfFList = generateFriendsOfFriendsList(searchUser,userAccts)

  //remove friends from foff list


  returnContent["person_score"] = {};
  returnContent["fof_score"] = {};
  
  

  res.setHeader('Content-Type', 'application/json');
  res.json(returnContent);

  
})

*/

/************************
*   Utility Functions   *
*************************/

//function for getting the max jaro-winkler score for a text body with a title
//will check each adjacent group of words in the body of the same number of tokens as the query string 
//String queryString - the string being compared against
//String corpusTitle - if the text has a title it will have the JW score weighted because of semantic importance
//String corpusBody - body text to be searched through
//return int max jw score between the title and each token group in the body
function maxJWScore(queryString, corpusTitle, corpusBody){

  var numQueryTokens = queryString.split(" ").length;
  var bodyArray = corpusBody.split(" ");
  var numBodyTokens = bodyArray.length;

  //start with the score for the title with increased value 
  var titleWeight = 1.15
  var jwScore = strDistance(queryString, corpusTitle) *titleWeight;

  //check each group within the body ased on the num of tokens in the query string
  for(i=0; i< numBodyTokens-(numQueryTokens-1); i++)
  {

    //build the string to compare QS to
    var compare = "";
    for(j=i; j<i+numQueryTokens; j++)
    {
      compare =  compare + " " + bodyArray[j]  ;
    }
    compare = compare.slice(1);

    var tmpScr = strDistance(queryString,compare)

    //console.log(compare+","+tmpScr);
    
    jwScore = Math.max(tmpScr, jwScore);
    //jwScore = Math.max(strDistance(queryString,compare), jwScore);
    
  }
  return jwScore;
}


//generate list of all friends with name and id
//int userID - target userID
//obj users - JSON obj with all sers
//returns an array of objs where each element contains the id and name
function generateFriendList(userID, users)
{

  var friends = users[userID].friends;
  var returnSet = [];

  for(f in friends)
  {
    var tmp = {};
    tmp["id"] = f;
    tmp["fName"]= users[f].fName;
    tmp["lName"] = users[f].lName;
    returnSet.push(tmp);
  }

  return returnSet;

}

//gnerate friends of friends for searches and recommendations
//check all users' circles which contain the request user and compile list
//int userID - target userID
//obj users - JSON obj with all users 
//returns an array of objs where each element contains the id and name
function generateFriendsOfFriendsList(userID, users){

    var friends = users[userID].friends;

    //create friends of friend list
    var fOfF = [];

    for(j=0;j<friends.length;j++)//for each friend
    {
      var tmpCircles = users[friends[j]].circles;//store their circles
      for(c in tmpCircles)//for each circle
      {
        var tmpMembers = tmpCircles[c].members
        if(tmpMembers.indexOf(userID)>=0) //if the target user is present
        {
          for(k=0;k<tmpMembers.length;k++)//for each friend of friend
          {
            //if that fOfF isn't in the list and isn't the target add it
            if(tmpMembers[k] != userID && fOfF.indexOf(tmpMembers[k])<0)
            {
              var tmp = {};
              tmp["id"] = tmpMembers[k];
              tmp["fName"]= users[tmpMembers[k]].fName;
              tmp["lName"] = users[tmpMembers[k]].lName;
              fOfF.push(tmp);
            }
          }
        }
      }
    }

    return fOfF;

  }//end recommend func

  //function to remove data from the provided data tree which from user does not have access to
  //data - tree of nested json objcts
  //permissions - list of tags which 
  function trimData(data, permissions)
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
      var tmp = trimData(data.content[j],permissions);
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


  //Load local users to speed GET req
  function loadUsers(){
    var load = JSON.parse(fs.readFileSync(path.join(__dirname,'/public/data/users.json')));
    userData = load.users;
    userMeta = load.meta;
  }

  //Load local content to speed Get req
  function loadContent(){
    var load = JSON.parse(fs.readFileSync(path.join(__dirname,'/public/data/content.json')));
    contentData = load.data;
    contentMeta = load.meta;
  }




/************************
*   Listener Function   *
*************************/


var server = app.listen(8081, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Health+ listening at http://%s:%s", host, port)

  loadUsers()
  loadContent()

  console.log("Data loaded");

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