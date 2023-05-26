const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const crypto = require("crypto");
const cookie = require("cookie-parser");
const uuid = require("uuid");
const app = express();
const PORT = 3000;

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "uploads/");
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		const extension = file.originalname.split(".").pop();
		cb(null, file.fieldname + "-" + uniqueSuffix + "." + extension);
	},
});

const upload = multer({ storage: storage });

app.use(cookie("backend"));

const connection = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "root",
	database: "backend",
})
connection.connect((error) => {
	if(error){
		throw error;
	}else{
		console.log("Подключение к БД установлено")
	}
})


app.get("/", (req, res) => {
	res.send("<a href='/reg' >Зарегистрироваться</a> | <a href='/log'>Войти</a>")
})
app.get("/reg", (req, res) => {
	res.sendFile(__dirname + "/registration.html")
})
app.get("/log", (req, res) => {
	res.sendFile(__dirname + "/auth.html")
})
app.get("/lk", (req, res) => {
	let token = req.cookies["token"] == null ? undefined : req.cookies["token"];
	connection.query("SELECT * FROM users WHERE token = ?", [token],
		(err, result) => {
			if(result.length){
				let name = result[0].name;
				let last_name = result[0].lastname;
				let age = result[0].age;
				let avatar = result[0].image;
				// res.sendFile(__dirname + "/lk.html",)
				res.send(`
					<!DOCTYPE html>
					<html lang="en">
					<head>
						<meta charset="UTF-8">
						<title>lk</title>
					</head>
					<body>
						<div class="container">
							 ${avatar ? `<img src="${avatar}" alt="img" class="avatar">` : ""}
							<h4 class="name">${name}</h4>
							<h4 class="last_name">${last_name}</h4>
							<p class="age">${age}</p>
						</div>
					</body>
					</html>
				`)
			}else{
				res.send("<h1>Доступ запрещен</h1>");
			}
		});


})
app.get("/logout", (req, res) => {
	res.clearCookie("token");
	res.send("<h1>Logout</h1>")
})
app.post("/reg",multer().none(), (req, res) => {
	let sent_res = "Success";
	let avatar = req.file ? req.file.path : null;
	const email_elem = req.body.email.toLowerCase();
	console.log(req.body.avatar)
	const hash_pass = crypto
		.createHash("sha256", "backend")
		.update(req.body.password)
		.digest("hex");
	connection.query("SELECT id FROM users where email = ?", [email_elem],
		(error, result, metaData) => {
			if(result.length){
				console.log("Exist");
				sent_res = "Exist"
				res.send(sent_res)
			}else {
				let user = [req.body.name, req.body.lastname, req.body.age, avatar, email_elem, hash_pass];
				connection.query("INSERT INTO `users`(`name`, `lastname`, `age`, `image`, `email`, `pass`) VALUES( ?, ?, ?, ?, ?, ?)", user,
					(error, result, metaData) => {
						console.log(error)
						console.log(result)
						res.send(sent_res)
					})
			}
		})


})


app.post("/log", multer().none(), (req, res) => {
	const email_elem = req.body.email.toLowerCase();
	connection.query("SELECT * FROM users where email = ?", [email_elem],
		(err, result) => {
			if(result.length){
				const hash_pass = crypto
					.createHash("sha256", "backend")
					.update(req.body.password)
					.digest("hex");
				if(hash_pass === result[0].pass){
					let uid = uuid.v4();
					connection.query("UPDATE users SET token = ? WHERE id = ?", [uid, result[0].id]);
					res.cookie("token", uid);
					console.log("Authorisation successful");
					res.send("Success");
				}else {
					console.log("Incorrect password");
					res.send("Error pass");
				}
			}else {
				console.log("Incorrect email");
				res.send("Error email");

			}
		})
})

app.listen(PORT, () => {
	console.log(`Server successful with ${PORT} port`)
})