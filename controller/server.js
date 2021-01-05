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

const sql_operations = require(`${project_root}/model/sql_operations.js`);

const express = require("express");
const exp_hbs = require("express-handlebars");
const http = require("http");
const socket_io = require("socket.io");
const socket_io_client = require("socket.io-client");
const child_process = require("child_process");
const file_upload = require("express-fileupload");
const file_system = require("fs");

sql_operations.set_client(config);
sql_operations.connect_to_db().then(() => sql_operations.init_db(config)).catch((error) => console.error(error));

const app = express();
const server = http.createServer(app);
const io = socket_io(server);
app.use(file_upload());
app.use(express.static(`${project_root}/view`));
app.set("views", `${project_root}/view/html`);
app.set("view engine", "handlebars");
app.engine("handlebars", exp_hbs({
	layoutsDir: `${project_root}/view/html`,
	defaultLayout: "template.handlebars"
}));

app.get(["/apps/dark-mode-pdf"], (req, res) => {
	res.render("index.handlebars", {
		title: "dark mode PDF — j9108c",
		description: "converts PDFs to dark mode",
		href_prefixes: href_prefixes_copy
	});
});

app.post("/apps/dark-mode-pdf/upload", (req, res) => {
	req.files.file.mv(`${project_root}/data/${req.files.file.name}_in.pdf`, (err) => ((err) ? console.error(err) : null));

	res.end(); // do nothing with response (but this line is required bc an action on res is required after any request ?)
});

app.get("/apps/dark-mode-pdf/download", (req, res) => {
	console.log("sending pdf to your downloads");
	io.to(req.query.socket_id).emit("message", "sending pdf to your downloads");

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

	sql_operations.add_visit();

	io.to(socket.id).emit("update_countdown", countdown_copy);
	if (stats_copy != null) {
		io.to(socket.id).emit("update_domain_request_info", stats_copy[0], stats_copy[1], stats_copy[2], stats_copy[3], stats_copy[4], stats_copy[5]);
	} else {
		setTimeout(() => ((stats_copy != null) ? io.to(socket.id).emit("update_domain_request_info", stats_copy[0], stats_copy[1], stats_copy[2], stats_copy[3], stats_copy[4], stats_copy[5]) : null), 5000);
	}

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
				sql_operations.add_conversion();
				
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
			
			sql_operations.add_conversion();
			
			io.to(socket.id).emit("download", random_file_name);
		});
	});
});

let href_prefixes_copy = null;
let countdown_copy = null;
let stats_copy = null;
const io_as_client = socket_io_client.connect("http://localhost:1025", {
	reconnect: true,
	extraHeaders: {
		app: "dark-mode-pdf"
	}
});
io_as_client.on("connect", () => {
	console.log("connected as client to localhost:1025");

	io_as_client.on("store_href_prefixes", (href_prefixes) => href_prefixes_copy = href_prefixes);
	
	io_as_client.on("update_countdown", (countdown) => {
		io.emit("update_countdown", countdown);

		countdown_copy = countdown;
	});

	io_as_client.on("update_domain_request_info", (today_total, last7days_total, last30days_total, today_countries, last7days_countries, last30days_countries) => {
		io.emit("update_domain_request_info", today_total, last7days_total, last30days_total, today_countries, last7days_countries, last30days_countries);

		stats_copy = [today_total, last7days_total, last30days_total, today_countries, last7days_countries, last30days_countries];
	});
});

// port and listen
const port = process.env.PORT || 2000;
server.listen(port, () => console.log(`server started on localhost:${port}`));
