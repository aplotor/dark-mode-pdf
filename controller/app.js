let project_root = __dirname.split("/");
project_root.pop();
project_root = project_root.join("/");
console.log(project_root);

const express = require("express");
const exp_hbs = require("express-handlebars");
const child_process = require("child_process");
const file_upload = require("express-fileupload");
const http = require("http");
const socket_io = require("socket.io");
const file_system = require("fs");
const node_pg = require("pg");

const secrets = require(`${project_root}/_secrets.js`);

const sql_client = new node_pg.Client(secrets.sql_connection);
sql_client.connect((err) => {
	if (err) {
		console.error(err);
	} else {
		console.log("connected to sql db");

		sql_client.query(
			"create table if not exists visit (" +
				"id int primary key, " +
				"count int not null" +
			")",
			(err, result) => ((err) ? console.error(err) : null)
		);
	
		sql_client.query(
			"insert into visit " +
			"values (0, 0) " +
			"on conflict do nothing",
			(err, result) => ((err) ? console.error(err) : null)
		);
	}
});

const app = express();
const server = http.createServer(app);
const io = socket_io(server);
app.use(express.static(`${project_root}/view`));
app.use(file_upload());
app.set("views", `${project_root}/view/html`);
app.set("view engine", "handlebars");
app.engine("handlebars", exp_hbs({
	layoutsDir: `${project_root}/view/html`,
	defaultLayout: "template.handlebars"
}));

app.get(["/", "/apps/dark-mode-pdf"], (req, res) => {
	if (req.url == "/" || req.url.endsWith("/")) {
		res.redirect(301, "/apps/dark-mode-pdf");
	}

	res.render("index.handlebars", {
		title: "dark mode PDF"
	});

	sql_client.query(
		"update visit " +
		"set count=count+1 " +
		"where id=0",
		(err, result) => ((err) ? console.error(err) : null)
	);
});

app.post("/", (req, res) => {
	req.files.file.mv(`${project_root}/data/${req.files.file.name}_in.pdf`, (err) => ((err) ? console.error(err) : null));

	res.end(); // do nothing with response (but this line is required bc an action on res is required after any request ?)
});

app.get("/download", (req, res) => {
	res.download(`${project_root}/data/${req.query.random_file_name}_out.pdf`, `${req.query.random_file_name}_out.pdf`, () => {
		console.log("sending dark mode pdf to your downloads");
		io.to(req.query.socket_id).emit("message", "sending dark mode pdf to your downloads");

		// delete files from server storage
		console.log("deleting your data from the server");
		io.to(req.query.socket_id).emit("message", "deleting your data from the server");

		file_system.unlink(`${project_root}/data/${req.query.random_file_name}_in.pdf`, (err) => ((err) ? console.error(err) : null));

		file_system.unlink(`${project_root}/data/${req.query.random_file_name}_out.pdf`, (err) => ((err) ? console.error(err) : null));

		console.log("your data has been deleted from the server");
		io.to(req.query.socket_id).emit("message", "your data has been deleted from the server");
	});
});

io.on("connect", (socket) => {
	console.log(`socket connected: ${socket.id}`);

	socket.on("transform", (random_file_name, transform_option) => {
		const spawn = child_process.spawn(`${project_root}/virtual_environment/bin/python`, ["-u", `${project_root}/model/convert_pdf.py`, random_file_name, transform_option]);

		spawn.stderr.on("data", (data) => { // if error in python process
			let python_print = data.toString();
			console.error(python_print);
		});

		spawn.stdout.on("data", (data) => {
			let python_print = data.toString();
			console.log(python_print);
			if (python_print != "\n") {
				io.to(socket.id).emit("message", python_print);
			}
		});

		spawn.on("exit", (exit_code) => {
			console.log(`python process exited with code ${exit_code}`);
			io.to(socket.id).emit("download", random_file_name);
		});
	});
});

// port and listen
const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`server started on port ${port}`));
