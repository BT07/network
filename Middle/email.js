
module.exports = (function() {
	return{
sendmail:function(FName,MName,LName,PRno,password,EId)
{
var nodemailer = require('nodemailer');
var fname = FName;
var mname =MName;
var lname = LName;
var uName = PRno;
var pw = password;
var mailId = EId;
var htmlData="<style> \
table, th, td { \
    width:40% ; \
  border: 1px solid black; \
  border-collapse: collapse; \
} \
th, td { \
  padding: 5px; \
  text-align: left;    \
}  \
</style> \
<body> \
 \
<p>Dear "+fname+" "+ mname+" "+ lname+"  </p> \
Your Login details are given bellow, please login with the below credentials to view your certificates. \
<br> \
<table > \
<tr > \
    <th >Student Information</th> \
    </tr> \
  <tr> \
    <td>Login id:</td> \
    <td>"+uName+"</td> \
  </tr> \
  <tr> \
    <td>Password:</td> \
    <td>"+pw+"</td> \
  </tr> \
</table> \
 Regards SecureCert\
</body>" 

  var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
           user: 'underdogs15it@gmail.com',
           pass: 'beitunderdogs'
       }
   });
  const mailOptions = {
    from: 'underdogs15it@gmail.com', // sender address
    to:mailId, // list of receivers
    subject: 'Student Enrollment Credentials', // Subject line
    html:   htmlData  // plain text body
  };
  transporter.sendMail(mailOptions, function (err, info) {
    if(err)
      console.log(err)
    else
      console.log(info);
 });
}
    }
});

