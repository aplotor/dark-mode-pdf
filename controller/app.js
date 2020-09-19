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

const app = express();
const server = http.createServer(app);
const io = socket_io(server);
app.use(express.static(`${project_root}/view`));
app.use(file_upload());
app.set("s_io", io);
app.set("views", `${project_root}/view/html`);
app.set("view engine", "handlebars");
app.engine("handlebars", exp_hbs({
	layoutsDir: `${project_root}/view/html`,
	defaultLayout: "template.handlebars"
}));

app.get("/apps/dark-mode-pdf", (req, res) => {
	res.render("index.handlebars", {
		title: "dark mode PDF"
	});
});

app.post("/", (req, res) => {
	req.files.file.mv(`${project_root}/data/${req.files.file.name}_in.pdf`, (error) => ((error) ? console.error(error) : null));

	res.end(); // do nothing with response (but this line is required bc an action on res is required after any request ?)
});

app.get("/apps/dark-mode-pdf/download", (req, res) => {
	const s_io = req.app.get("s_io");

	res.download(`${project_root}/data/${req.query.random_file_name}_out.pdf`, `${req.query.random_file_name}_out.pdf`, () => {
		console.log("sending dark mode pdf to your downloads");
		s_io.to(req.query.socket_id).emit("message", "sending dark mode pdf to your downloads");

		// delete files from server storage
		console.log("deleting your data from the server");
		s_io.to(req.query.socket_id).emit("message", "deleting your data from the server");

		file_system.unlink(`${project_root}/data/${req.query.random_file_name}_in.pdf`, (error) => ((error) ? console.error(error) : null));

		file_system.unlink(`${project_root}/data/${req.query.random_file_name}_out.pdf`, (error) => ((error) ? console.error(error) : null));

		console.log("your data has been deleted from the server");
		s_io.to(req.query.socket_id).emit("message", "your data has been deleted from the server");
	});
});

io.on("connect", (socket) => {
	console.log(`socket connected: ${socket.id}`);

	socket.on("process", (random_file_name, transform_option) => {
		const spawn = child_process.spawn(`${project_root}/virtual_environment/bin/python`, ["-u", `${project_root}/model/convert_pdf.py`, random_file_name, transform_option]);

		spawn.stderr.on("data", (data) => { // if error in python process
			let python_print = data.toString();
			python_print = python_print.substring(0, python_print.length-1);
			console.error(python_print);
		});

		spawn.stdout.on("data", (data) => {
			let python_print = data.toString();
			console.log(python_print);
			io.to(socket.id).emit("message", python_print);
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
