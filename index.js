const express = require("express");
const mysql = require('mysql');
const app = express();
const bcrypt = require('bcrypt');
const session = require('express-session');
const pool = dbConnection(); 
const path = require('path');

const { startTracking, stopTracking } = require('./scripts/timeTracking.js');

app.use(express.static(path.join(__dirname, 'css')));
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'images')));

app.set("view engine", "ejs");

app.use(session({
    secret: "top secret",
    resave: true, 
    saveUninitialized: true
}))

// example
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

function isAdmin(req, res, next) {
    if (req.session.admin === 1) {
        next(); // User is authenticated and is an admin
    } else {
        // User is not an admin, so redirect or show an error
        res.redirect('/'); // Redirect non-admin users to the home page
        // You can also show an error message, render a different page, or take other actions.
    }
}

async function getGames() {
    const sql = 'SELECT executable FROM game';
    try{
        const games = await executeSQL(sql);
        // console.log(Object.values(games).map(game => game.executable));
        return Object.values(games); //return array of executable names to monitor
    } catch (error) {
        console.error('Error retrieving games:', error);
        console.log('Error retrieving games:')
        throw error;
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
    
   
    if (passwordMatch && rows[0].admin == 0) {
        //run timeTracking.py in "/scripts/timeTracking.py" CESAR
        const gamesToMonitor = await getGames();
        startTracking(gamesToMonitor.map(game => game.executable));
        // console.log('Games to monitor:', gamesToMonitor);

        req.session.authenticated = true; 
        req.session.username = rows[0].username;
        req.session.userId = rows[0].userId;
        res.redirect("info");
    } 
    else if (passwordMatch && rows[0].admin == 1)
    {
        req.session.authenticated = true; 
        req.session.admin = 1;
        req.session.username = rows[0].username;
        res.redirect("admin");
    }
    else {
        res.render("index", { loginError: true });
    }
});

app.get('/admin', isAuthenticated , isAdmin,  async(req, res) => {

    const userName = req.session.username;
    const permission = req.session.admin; 

    try {
        // Retrieve game suggestions ordered by popularity
        const sql = `
            SELECT game_name, COUNT(*) as suggestion_count
            FROM suggestions
            GROUP BY game_name
            ORDER BY suggestion_count DESC;
        `;
        const popularSuggestions = await executeSQL(sql);

        const successMessage = req.query.success; // Get the success message from the query parameter

        // Render the admin view and pass the popular game suggestions and success message to it
        res.render('admin', { popularSuggestions, successMessage, userName, permission});
    } catch (error) {
        console.error('Error retrieving game suggestions:', error);
        // Handle the error, possibly redirect to an error page
        res.status(500).send('Error retrieving game suggestions.');
    }
   
 });

 
 app.post('/admin', isAuthenticated, isAdmin, async (req, res) => {
    const { price, hours, cod } = req.body;

    let updateInfoSql = 'UPDATE Info SET ';
    const updateParams = [];

    if (price !== undefined && price.trim() !== '') {
        updateInfoSql += 'price = ?, ';
        updateParams.push(price);
    }

    if (hours !== undefined && hours.trim() !== '') {
        updateInfoSql += 'hours = ?, ';
        updateParams.push(hours);
    }

    if (cod !== undefined && cod.trim() !== '') {
        updateInfoSql += 'cod = ?, ';
        updateParams.push(cod);
    }

    // Check if any fields were provided for update
    if (updateParams.length === 0) {
        return res.redirect('/admin?success=No fields to update');
    }

    // Remove the trailing comma and space
    updateInfoSql = updateInfoSql.slice(0, -2);

    // Add a WHERE clause to specify which row to update
    updateInfoSql += ' WHERE ID = 1';

    try {
        await executeSQL(updateInfoSql, updateParams);
        // Redirect back to the admin page with a success message
        res.redirect('/admin?success=Info updated successfully');
    } catch (error) {
        console.error('Error updating info:', error);
        // Handle the error, possibly redirect to an error page
        res.status(500).send('Error updating info.');
    }
});
app.post('/admin/addGame', isAuthenticated, isAdmin, async (req, res) => {
    const { name, desc, img, genre } = req.body;

    // Insert the new game into the "game" table
    const insertGameSql = 'INSERT INTO game (name, `desc`, img, genre) VALUES (?, ?, ?, ?)';

    try {
        await executeSQL(insertGameSql, [name, desc, img, genre]);
        // Redirect back to the admin page with a success message
        res.redirect('/admin?success=Game added successfully');
    } catch (error) {
        console.error('Error adding game:', error);
        // Handle the error, possibly redirect to an error page
        res.status(500).send('Error adding game.');
    }
});

app.post('/admin/delete-game', isAuthenticated, isAdmin, async (req, res) => {
    const gameNameToDelete = req.body.gameName;

    // Add code to delete the game with the specified name from the database
    const deleteGameSql = 'DELETE FROM game WHERE name = ?';

    try {
        await executeSQL(deleteGameSql, [gameNameToDelete]);
        // Redirect back to the admin page with a success message
        res.redirect('/admin?success=Game deleted successfully');
    } catch (error) {
        console.error('Error deleting game:', error);
        // Handle the error, possibly redirect to an error page
        res.status(500).send('Error deleting game.');
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

    let emailCheckSQL = 'SELECT * FROM users WHERE email = ?';
    let existingUser = await executeSQL(emailCheckSQL, [email]);

    if (existingUser.length > 0) {
        // Email already exists, render the "SignUp" view with an error message
        return res.render("SignUp", { emailExistsError: true });
    }
    

    const saltRounds = 10; // Adjust the number of salt rounds as needed
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let sql = `INSERT INTO users
    (username, email,  Password, admin)
    VALUES       
    (?,?,?,?)`

    let params = [username, email, hashedPassword, admin];

    executeSQL(sql, params);

    res.redirect("/"); 

 });

app.get('/info', isAuthenticated , async(req, res) => {
    // Define a variable and set it to "hello"

    const userName = req.session.username;
    const isAdmin = req.session.admin === 1;

    let sql = 'SELECT * FROM Info';
    let infoData = await executeSQL(sql);

    let sql1 = 'SELECT * FROM game'
    let gameData = await executeSQL(sql1);

    res.render('info', { infoData, gameData, userName, isAdmin });
    

});
app.post('/info', isAuthenticated , async(req, res) => {
    let suggestion = req.body.gameSuggestion;

    // Check if the suggestion is not blank or only contains whitespace
    if (suggestion.trim() === '') {
        // Handle the case where the suggestion is blank
        return res.redirect('/info');
    }

    let sql = 'INSERT INTO suggestions (game_name) VALUES (?)';
    let params = [suggestion];

    executeSQL(sql, params);

    res.redirect('/info');
});

app.get('/infoPublic', async(req, res) => {
    let sql = 'SELECT * FROM Info';
    let infoData = await executeSQL(sql);

    let sql1 = 'SELECT * FROM game'
    let gameData = await executeSQL(sql1);

    res.render('infoPublic', { infoData, gameData});
 });

app.get('/profile', isAuthenticated ,async(req, res) => {

    try {
        const userId = req.session.userId;

        // Fetch user interactions from the game_interaction table
        const interactionsSql = `
            SELECT gi.playtime, gi.date, g.name, g.img
            FROM game_interaction gi
            JOIN game g ON gi.gameID = g.gameID
            WHERE gi.userID = ?
            ORDER BY gi.date DESC;
        `;
        const interactions = await executeSQL(interactionsSql, [userId]);

        // Calculate total playtime
        const totalPlaytime = interactions.reduce((total, interaction) => total + interaction.playtime, 0);

        // Find the game with the most playtime
        const mostPlayedGame = interactions.reduce((max, interaction) => (interaction.playtime > max.playtime ? interaction : max), interactions[0]);

         res.render('profile', { userName: req.session.username, interactions, totalPlaytime, mostPlayedGame });
    } catch (error) {
        console.error('Error fetching user interactions:', error);
        // Handle the error, possibly redirect to an error page
        res.status(500).send('Error fetching user interactions.');
    }

 });




app.get('/logout', isAuthenticated , async (req, res) => {
    const gameInteractions = stopTracking(); // Get game interactions
    const username = req.session.username; // Get the username from the session

    // Query to get the userID from the database using the username
    const userSql = 'SELECT userID FROM users WHERE username = ?';
    const userRows = await executeSQL(userSql, [username]);

    if (userRows && userRows.length > 0) {
        const userID = userRows[0].userID;

        const dateTime = new Date().toISOString().replace('T', ' ').substring(0, 19); // Get the current date and time
        
        for (const interaction of gameInteractions) {
            try {
                // Find the gameID based on the executable
                const gameSql = 'SELECT gameID FROM game WHERE executable = ?';
                const gameRows = await executeSQL(gameSql, [interaction.executable]);
                if (gameRows && gameRows.length > 0 && gameRows[0].gameID) {
                    const gameID = gameRows[0].gameID;
                    console.log('Game ID:', gameID, 'for executable:', interaction.executable);
    
                    // Insert into game_interactions
                    const insertSql = 'INSERT INTO game_interaction (playtime, date, gameID, userID) VALUES (?, ?, ?, ?)';
                    await executeSQL(insertSql, [interaction.playtime, dateTime, gameID, userID]);
                    console.log('Inserted game interaction:', interaction, 'for user ID:', userID, 'at:', dateTime);
                } else {
                    console.error(`No gameID found for executable: ${interaction.executable}`);
                    // Handle the case where no gameID was found
                }
            } catch (error) {
                console.error('Error processing game interaction for:', interaction.executable.toString(), error);
            }
        }
    } else {
        console.error('No user found with username:', username);
    }

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
      database: "lhn93p39538r11to",
      

   }); 

   return pool;

} //dbConnection

//start server
app.listen(3000, () => {
console.log("Expresss server running...")
} )

