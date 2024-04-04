# SNFramework

SNFramework is a tool that makes building a backend application hassle free. It contains interfaces for creating controllers and managing other utilities

## Installation

You can install directly from this repo using git   to install SNframework. You can Specify the tag to use. e.g 1.0.9

```bash
yarn add git+ssh://git@ssh.dev.azure.com:v3/ATBTechLtd/MyXalary/SNFramework#2.2.2

npm install git+ssh://git@ssh.dev.azure.com:v3/ATBTechLtd/MyXalary/SNFramework#2.2.2
```

## Initialization

```javascript

/** using module **/
import SNFramework from "snframework";
/** using commonjs **/
const SNFramework = require("snframework").default;

const framework = new SNFramework();
```

## MyXalary Auth

There are three types of auth
1. Finratus Mobile User
2. Myxalary Employee 
3. MyXalary Users


```javascript
//finratusAPI - API for finratus user validations
const finratusAPI = process.env.FINRATUS_API; //Ignore finratus if you do not intend to use mobile client
//setup authentication
const auth = framework.appAuth.setup({ finratusAPI })
export default auth
```

  ####  USAGE OF AUTH MODULE

 1.  You can use the auth middleware to authenticate all request entering your app.

```javascript
import express from "express";
const Router = express.Router();
//Add auth middleware to your route  to authenticate user
Router.use(auth.auth)

//Access user information from the request object like so
  const { 
    userRole,
    userId, 
     firstName,
     lastName, 
     fullName,
     isAdmin,
    companyID,
     fid, //finratus ID
    email,
    profileImgUrl,
    permissions,
    isEmployee,
    isManager,
    subordinates,
    manager,
    myxalaryEmployee, //check if request is coming from myxalary employee
    isMobileClient, //check if the request is coming from mobile client
    token,
    isMentee,
    mentees
} = req.user
```
 2.  You can authorize users based on their role.

```javascript
import express from "express";
const Router = express.Router();
//Check if user is an employee
Router.get("/",[auth.isEmployee], function(req,res)=>{})
//Check if user is a Manager
Router.get("/",[auth.isSupervisor], function(req,res)=>{})
//Check if user is an Admin User
Router.get("/",[auth.isAdmin], function(req,res)=>{})
//Check if user is either an Admin or Supervisor
Router.get("/",[auth.isSupervisorOrAdmin], function(req,res)=>{})
//check id user is a mentee
Router.get("/",[auth.isMentee], function(req,res)=>{})
```

## File Upload Module
   You can upload a file using either cloudinary or azure blobs. Below is an example

   1. Initalizing File Upload

```javascript
const fileUploader = framework.fileUploader()
```

2. Use File Upload By Adding a Route to upload File
```javascript
import express from "express";
import framework from "..."
const Router = express.Router();
const app = express();
const fileUploader = framework.fileUploader()
//add response transformer
app.use(framework.utils.responseTransformer)

//Check if user is an employee
Router.get("/", function(req,res)=>{})

//using azure blobs
const type = framework.utils.FILE_TYPES.AZURE;
const options = {
    url: 'azure blob url',
    container: 'azure blob container'
}

//using cloudinary as media platform
const type = framework.utils.FILE_TYPES.CLOUDINARY;
const options = {
    cloud_name: CLOUDINARY_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
}
router.use("/", fileUploader.setup({ type, options }).addUploadFileRoute())

app.listen(3000)

```

#### Access upload url from ***http://localhost:3000/files*** This API Returns 

```json
#if a single file is uploaded
{
    data:{
    [filesName]:{
        url,
        type,
        format,
        secure_url,
        filePath
      }
 }
}

#if a multiple file is uploaded
{
    data:{
    [filesName]:[{
        url,
        type,
        format,
        secure_url,
        filePath
      }]
 }
}
```

3. Use Methods directly
```javascript

const fileUploader = framework.fileUploader();


const file = req.files[0]

//use azure upload 
const result =  await fileUploader.azureUpload(file)

//use cloudinary upload 
const result = await fileUploader.cloudUpload(file)

```

## Message Queues

You can use the Framework to push to azure service bus MQs. Below is an example on how to

### Initialization

```javascript

const queue = new framework.MessageQueue({
    URL: constants.AZURE_SERVICE_BUS_URL,
    TOPIC: constants.AZURE_SERVICE_BUS_TOPIC
});

export default queue;

```

### Push to Queue
You can push multiple messages to the queue or just a single message
```javascript
import queue from "...";

//as a single message
const data = {
    body:{
        id:1,
        name:"Stanley"
    }
}

//as a multiple  message
const data = [{
    body:{
        id:1,
        name:"Stanley"
    }
},
{
    body:{
        id:1,
        name:"Gift"
    }
}]
 queue.addToQueue({ message: data })


```

### Recieve From  Queue
You can listen for messages from the Queue 
```javascript

import queue from "..."

const getMessage = (receiver) => {
    return async (message) => {
            const body = message.body
            console.log(body)
    }
}

const handleError = (receiver) => {
    return async (error) => {
        console.log(error)
    }
}

queue.receiveFromQueue({
    handler: getMessage,
    errorHandler: handleError,
});


```

### Send Mails

You can send mails  using the framework. here are the steps

1. Create the folder in your root folder called mails
2. Create html or hbs template files 
3. If yo are using hbs, you can create a folder /mails/partials for your partial templates

```javascript
import SNFramework from "snframework";

const mailer = SNFramework.setMailer({
  KEY: MAILGUN_API_KEY,
  DOMAIN: MAILGUN_DOMAIN,
  FROM: EMAIL_FROM,
  useHandleBars: true, // tells the method to expect hbs templates
});


  await mailer.sendMail({
        templateName, // template name
        cc, // receipts in copy
        tags, //tags to replace in template
        to,
        recipientVariable,
      });
```

## Other Utils
```javascript

const {responseTransformer, wrapper, request ,  buildQuery} = framework.utils;

// middleware for handle request and transform request to framework pattern
 app.use(responseTransformer);

 // wrapper to wrap each request for framework API pattern

 Router.get("/", wrapper((req, res)=>{}))

//request to make external api calls
const { success,code, data , error} = request.post({
   url, body, headers
})

//get query from request and transform to mongoDB query
 const {filter sort, page, limit, project }  = buildQuery(req.query);

 //filter - mongoDB query
 /***
  *  e.g  ?name=stanley,gift&age=12&amount=3000:9000
  * 
  *  this will return
  * 
  *   {
  *    $and:[
  *     {
  *       name: {
  *          $in:["stanley","gift"]
  *           }
  *      },
  *      {
  *        age:12
  *      },
  *      {
  *        amount:{
  *            $gte: 3000,
  *            $lte: 9000
  *          }
  *       }
  *      ]
  *   }
  * 
  * */

//page - requested page
// limit - limit of data to return
// project - data to display
// sort - what to sort by
```

### Create Controller

# TODO