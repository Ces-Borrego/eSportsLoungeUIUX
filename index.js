const express = require("express");
const mysql = require('mysql');
const app = express();
const bcrypt = require('bcrypt');
const session = require('express-session');
const pool = dbConnection(); 
const path = require('path');

app.use(express.static(path.join(__dirname, 'css')));

app.set("view engine", "ejs");

app.use(session({
    secret: "top secret",
    resave: true, 
    saveUninitialized: true
}))


const saltRounds = 10;

function isAuthenticated(req, res, next)
{
    if(!req.session.authenticated)
    {
        res.redirect('/'); 
    }
    else{
        next(); 
    }
}

//routes
app.use(express.urlencoded({extended: true}));

app.get('/', (req, res) => {
   res.render("index");
});

app.post('/', async (req, res) => {
    let email = req.body.username;
    let password = req.body.password;


    let hashedpwd = '';
    
    let sql = "Select * FROM users WHERE email = ?"
    let rows = await executeSQL(sql, [email]);

    if (rows.length > 0)
    {
        hashedpwd = rows[0].password; 
    }

    let passwordMatch = await bcrypt.compare(password, hashedpwd);
    
    
    if (passwordMatch) {
        req.session.authenticated = true; 
        res.render("info");
    } else {
        res.render("index", { loginError: true });
    }
});

app.get('/SignUp', (req, res) => {
    res.render('SignUp');
 });

 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

 app.post('/SignUp',async (req, res) => {
     let username = req.body.username; 
     let email = req.body.email; 
     let password = req.body.password; 
     let Cpassword = req.body.confirmPassword; 
     let admin = 0; 

    if (!emailRegex.test(email)) {
        return res.render("Signup", { emailError: true });
    }
     
     if (password !== Cpassword) {
        return res.render("Signup", { passwordError: true });
    }

    const saltRounds = 10; // Adjust the number of salt rounds as needed
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let sql = `INSERT INTO users
    (username, email,  Password, admin)
    VALUES
    (?,?,?,?)`

    let params = [username, email, hashedPassword, admin];

    executeSQL(sql, params);

    res.render('index');

 });

app.get('/profile', isAuthenticated ,(req, res) => {

     res.render("profile");

 });

app.get('/logout', isAuthenticated ,(req, res) => {

    req.session.destroy(); 
    res.redirect("/"); 

});


app.get("/dbTest", async function(req, res){
let sql = "SELECT CURDATE()";
let rows = await executeSQL(sql);
res.send(rows);
});//dbTest

async function executeSQL(sql, params){
return new Promise (function (resolve, reject) {
pool.query(sql, params, function (err, rows, fields) {
if (err) throw err;
   resolve(rows);
});
});
}

function dbConnection(){

   const pool  = mysql.createPool({

      connectionLimit: 30,
      host: "lfmerukkeiac5y5w.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
      user: "aaol0dz72pzpgk63",
      password: "qso7gobuqnu2olvs",
      database: "lhn93p39538r11to"

   }); 

   return pool;

} //dbConnection

//start server
app.listen(3000, () => {
console.log("Expresss server running...")
} )

