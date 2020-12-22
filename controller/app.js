let config = null;
if (process.argv[0].slice(0, 13) == "/home/j9108c/") {
	config = "dev";
} else {
	config = "prod";
}
console.log(config);

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

let sql_client = null;
if (config == "dev") {
	sql_client = new node_pg.Client(secrets.sql_connection_test);
} else if (config == "prod") {
	sql_client = new node_pg.Client(secrets.sql_connection_prod);
}

sql_client.connect((err) => {
	if (err) {
		console.error(err);
	} else {
		console.log("connected to sql db");

		sql_client.query(
			"create table if not exists visit (" +
				"id int primary key, " +
				"count int not null" +
			");",
			(err, result) => ((err) ? console.error(err) : null)
		);

		sql_client.query(
			"insert into visit " +
			"values (0, 0) " +
			"on conflict do nothing;",
			(err, result) => ((err) ? console.error(err) : null)
		);

		sql_client.query(
			"create table if not exists conversion (" +
				"id int primary key, " +
				"count int not null" +
			");",
			(err, result) => ((err) ? console.error(err) : null)
		);

		sql_client.query(
			"insert into conversion " +
			"values (0, 0) " +
			"on conflict do nothing;",
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
		title: "dark mode PDF",
		description: "converts PDFs to dark mode"
	});
});

app.post("/", (req, res) => {
	req.files.file.mv(`${project_root}/data/${req.files.file.name}_in.pdf`, (err) => ((err) ? console.error(err) : null));

	res.end(); // do nothing with response (but this line is required bc an action on res is required after any request ?)
});

app.get("/download", (req, res) => {
	console.log("sending dark mode pdf to your downloads");
	io.to(req.query.socket_id).emit("message", "sending dark mode pdf to your downloads");

	res.download(`${project_root}/data/${req.query.random_file_name}_out.pdf`, `${req.query.random_file_name}_out.pdf`, () => {
		console.log("deleting your data from the server");
		io.to(req.query.socket_id).emit("message", "deleting your data from the server");

		file_system.unlink(`${project_root}/data/${req.query.random_file_name}_in.pdf`, (err) => ((err) ? console.error(err) : null));

		file_system.unlink(`${project_root}/data/${req.query.random_file_name}_temp.pdf`, (err) => ((err) ? console.error(err) : null));

		file_system.unlink(`${project_root}/data/${req.query.random_file_name}_out.pdf`, (err) => ((err) ? console.error(err) : null));

		console.log("your data has been deleted from the server");
		io.to(req.query.socket_id).emit("message", "your data has been deleted from the server");

		console.log(`end ${req.query.random_file_name}`);
		io.to(req.query.socket_id).emit("message", `end ${req.query.random_file_name}`);
	});
});

io.on("connect", (socket) => {
	console.log(`socket connected: ${socket.id}`);

	sql_client.query(
		"update visit " +
		"set count=count+1 " +
		"where id=0;",
		(err, result) => ((err) ? console.error(err) : null)
	);

	sql_client.query(
		"select count " +
		"from visit " +
		"where id=0;",
		(err, result) => ((err) ? console.error(err) : io.emit("update_visit_count", result.rows[0].count))
	);

	socket.on("transform", (random_file_name, transform_option) => {
		console.log(`start ${random_file_name}`);
		io.to(socket.id).emit("message", `start ${random_file_name}`);

		const spawn = child_process.spawn(`${project_root}/virtual_environment/bin/python`, ["-u", `${project_root}/model/transform.py`, random_file_name, transform_option]);

		spawn.stderr.on("data", (data) => {
			let python_stderr = data.toString();
			console.error(python_stderr);
		});

		spawn.stdout.on("data", (data) => {
			let python_stdout = data.toString();
			if (python_stdout != "\n") {
				console.log(python_stdout);
				io.to(socket.id).emit("message", python_stdout);
			}
		});

		spawn.on("exit", (exit_code) => {
			console.log(`spawn process exited with code ${exit_code}`);
			io.to(socket.id).emit("message", `spawn process exited with code ${exit_code}`);
			
			if (transform_option == "no_ocr_dark") {
				io.to(socket.id).emit("overlay", random_file_name);
			} else {
				sql_client.query(
					"update conversion " +
					"set count=count+1 " +
					"where id=0;",
					(err, result) => ((err) ? console.error(err) : null)
				);
				
				io.to(socket.id).emit("download", random_file_name);
			}
		});
	});

	socket.on("overlay", (random_file_name) => {
		io.to(socket.id).emit("message", "loading...");

		const spawn = child_process.spawn("java", ["-classpath", `${project_root}/resources/pdfbox v.2.0.22 CLI tool.jar`, `${project_root}/model/overlay.java`, random_file_name]);

		spawn.stderr.on("data", (data) => {
			let java_stderr = data.toString();
			console.error(java_stderr);
		});

		spawn.stdout.on("data", (data) => {
			let java_stdout = data.toString();
			if (java_stdout != "\n") {
				console.log(java_stdout);
				io.to(socket.id).emit("message", java_stdout);
			}
		});

		spawn.on("exit", (exit_code) => {
			console.log(`spawn process exited with code ${exit_code}`);
			io.to(socket.id).emit("message", `spawn process exited with code ${exit_code}`);
			
			sql_client.query(
				"update conversion " +
				"set count=count+1 " +
				"where id=0;",
				(err, result) => ((err) ? console.error(err) : null)
			);
			
			io.to(socket.id).emit("download", random_file_name);
		});
	});
});

// port and listen
const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`server started on port ${port}`));
