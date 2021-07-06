const project_root = process.cwd();
const run_config = (project_root.toLowerCase().slice(0, 20) == "/mnt/c/users/j9108c/" ? "dev" : "prod");
console.log(`${run_config}: ${project_root}`);

const sql_operations = require(`${project_root}/model/sql_operations.js`);
const file_operations = require(`${project_root}/model/file_operations.js`);

const express = require("express");
const express_hbs = require("express-handlebars");
const http = require("http");
const socket_io = require("socket.io");
const socket_io_client = require("socket.io-client");
const child_process = require("child_process");
const fileupload = require("express-fileupload");

sql_operations.connect_to_db().then(() => sql_operations.init_db()).catch((err) => console.error(err));
file_operations.cleanup().then(() => file_operations.cycle_cleanup()).catch((err) => console.error(err));

const app_name = "dark-mode-pdf";
const app_index = `/apps/${app_name}`; // index of this server relative to domain

const app = express();
const server = http.createServer(app);
const io = socket_io(server, {
	path: `${app_index}/socket.io`
});

app.use(`${app_index}/static`, express.static(`${project_root}/static`));
app.set("views", `${project_root}/static/html`);
app.set("view engine", "handlebars");
app.engine("handlebars", express_hbs({
	layoutsDir: `${project_root}/static/html`,
	defaultLayout: "template.handlebars"
}));

app.use(fileupload());

app.get(app_index, (req, res) => {
	res.render("index.handlebars", {
		title: `${app_name} — j9108c`,
		description: "converts PDFs to dark mode"
	});
});
app.get(app_index.split("-").join(""), (req, res) => {
	res.redirect(302, app_index);
});

app.post(`${app_index}/upload`, (req, res) => {
	req.files.file.mv(`${project_root}/data/${req.files.file.name}_in.pdf`, (err) => (err ? console.error(err) : null));
	res.end();
});

app.get(`${app_index}/download`, (req, res) => {
	console.log("sending pdf to your downloads");
	io.to(req.query.socket_id).emit("message", "sending pdf to your downloads");
	res.download(`${project_root}/data/${req.query.random_filename}_out.pdf`, `${req.query.random_filename}_out.pdf`, async () => {
		try {
			console.log("deleting your data from the server");
			io.to(req.query.socket_id).emit("message", "deleting your data from the server");
			await file_operations.purge(req.query.random_filename);
		} catch (err) {
			null;
		} finally {
			console.log("your data has been deleted from the server");
			io.to(req.query.socket_id).emit("message", "your data has been deleted from the server");

			console.log(`end ${req.query.random_filename}`);
			io.to(req.query.socket_id).emit("message", `end ${req.query.random_filename}`);
		}
	});
});

io.on("connect", (socket) => {
	console.log(`socket (${socket.id}) connected`);

	const headers = socket.handshake.headers;
	// console.log(headers);
	const socket_address = headers.host.split(":")[0];
	(socket_address == dev_private_ip_copy ? io.to(socket.id).emit("replace localhost with dev private ip", dev_private_ip_copy) : null);

	sql_operations.add_visit().catch((err) => console.error(err));

	io.to(socket.id).emit("update countdown", countdown_copy);
	if (domain_request_info_copy) {
		io.to(socket.id).emit("update domain request info", domain_request_info_copy);
	} else {
		setTimeout(() => (domain_request_info_copy ? io.to(socket.id).emit("update domain request info", domain_request_info_copy) : null), 5000);
	}

	socket.on("transform", (transform_option, random_filename, color_hex) => {
		console.log(`start ${random_filename}`);
		io.to(socket.id).emit("message", `start ${random_filename}`);

		const spawn = child_process.spawn(`${project_root}/virtual_environment/bin/python`, ["-u", `${project_root}/model/transform.py`, transform_option, random_filename, color_hex]);

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
			
			if (transform_option == "no_ocr_dark" || transform_option == "no_ocr_dark_retain_img_colors") {
				io.to(socket.id).emit("message", "loading...");

				const spawn = child_process.spawn("gs", ["-o", `${project_root}/data/${random_filename}_no_text.pdf`, "-sDEVICE=pdfwrite", "-dFILTERTEXT", `${project_root}/data/${random_filename}_in.pdf`]);

				spawn.on("exit", () => {
					const spawn = child_process.spawn("java", ["-classpath", `${project_root}/vendor/pdfbox CLI tool — v=2.0.22.jar`, `${project_root}/model/overlay.java`, transform_option, random_filename]);
		
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
						
						sql_operations.add_conversion().catch((err) => console.error(err));
						
						io.to(socket.id).emit("download", random_filename);
					});
				});
			} else {
				sql_operations.add_conversion().catch((err) => console.error(err));
				
				io.to(socket.id).emit("download", random_filename);
			}
		});
	});
});

let dev_private_ip_copy = null;
let countdown_copy = null;
let domain_request_info_copy = null;
const io_as_client = socket_io_client.connect("http://localhost:1025", {
	reconnect: true,
	extraHeaders: {app: app_name}
});
io_as_client.on("connect", () => {
	console.log("connected as client to j9108c (localhost:1025)");

	io_as_client.on("store hosts", (hosts) => app.locals.hosts = hosts);

	io_as_client.on("store dev private ip", (dev_private_ip) => dev_private_ip_copy = dev_private_ip);
	
	io_as_client.on("update countdown", (countdown) => io.emit("update countdown", countdown_copy = countdown));

	io_as_client.on("update domain request info", (domain_request_info) => io.emit("update domain request info", domain_request_info_copy = domain_request_info));
});

// set app local vars (auto passed as data to all hbs renders)
app.locals.hosts = null;
app.locals.app_index = app_index;
app.locals.repo = `https://github.com/j9108c/${app_name}`;
app.locals.current_year = new Date().getFullYear();

// port and listen
const port = process.env.PORT || 2000;
server.listen(port, () => console.log(`server (${app_name}) started on (localhost:${port})`));
