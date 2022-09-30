const backend = process.cwd();
import * as dotenv from "dotenv";
dotenv.config({
	path: `${backend}/.env_${process.env.RUN}`
});

const file = await import(`${backend}/model/file.mjs`);
const sql = await import(`${backend}/model/sql.mjs`);

import * as socket_io_server from "socket.io";
import * as socket_io_client from "socket.io-client";
import express from "express";
import http from "http";
import fileupload from "express-fileupload";
import child_process from "child_process";

let domain_request_info = null;

const app = express();
const server = http.createServer(app);
const io = new socket_io_server.Server(server, {
	cors: (process.env.RUN == "dev" ? {origin: "*"} : null),
	maxHttpBufferSize: 1000000 // 1mb in bytes
});
const app_socket = socket_io_client.io("http://localhost:1026", {
	autoConnect: false,
	reconnect: true,
	extraHeaders: {
		app: "dark-mode-pdf",
		secret: process.env.LOCAL_SOCKETS_SECRET
	}
});

const frontend = backend.replace("backend", "frontend");

const queue = {};

await file.init();
file.cycle_cleanup();
await sql.init_db();
sql.cycle_backup_db();
setInterval(() => {
	io.emit("update jobs queued", Object.keys(queue).length);
}, 100);

app.use(fileupload({
	limits: {
		fileSize: Number.parseInt(process.env.FILESIZE_LIMIT)
	}
}));

app.use("/", express.static(`${frontend}/build/`));

app.post("/upload", (req, res) => {
	(req.files.pdf ? req.files.pdf.mv(`${backend}/tempfiles/${req.files.pdf.name}_in.pdf`).catch((err) => console.error(err)) : null);
	res.end();
});

app.get("/download", (req, res) => {
	console.log("sending pdf to your downloads");
	io.to(req.query.socket_id).emit("message", "sending pdf to your downloads");
	res.download(`${backend}/tempfiles/${req.query.filename}_out.pdf`, `${req.query.filename}_out.pdf`, async () => {
		try {
			console.log("deleting your data from the server");
			io.to(req.query.socket_id).emit("message", "deleting your data from the server");
			await file.purge(req.query.filename);
		} catch (err) {
			null;
		} finally {
			console.log("your data has been deleted from the server");
			io.to(req.query.socket_id).emit("message", "your data has been deleted from the server");

			console.log(`end ${req.query.filename}`);
			io.to(req.query.socket_id).emit("message", `end ${req.query.filename}`);

			delete queue[req.query.socket_id];
		}
	});
});

app.all("*", (req, res) => {
	res.status(404).sendFile(`${frontend}/build/index.html`);
});

io.on("connect", (socket) => {
	console.log(`socket (${socket.id}) connected`);

	socket.on("layout mounted", () => {
		io.to(socket.id).emit("update domain request info", domain_request_info);
	});

	socket.on("route", (route) => {
		switch (route) {
			case "index":
				io.to(socket.id).emit("set limits", [
					Number.parseInt(process.env.FILESIZE_LIMIT),
					Number.parseInt(process.env.PAGE_LIMIT)
				]);
				break;
			default:
				break;
		}
	});

	socket.on("enqueue", async (filename, transform_option, text_color_hex, gradient_tone_hex, language_code) => {
		queue[socket.id] = {
			filename: filename,
			interval_id: null,
			reject: null
		};

		if (Object.keys(queue).length > 1) {
			io.to(socket.id).emit("message", "other job in progress");
			setTimeout(() => {
				io.to(socket.id).emit("message", "your job has been queued");
			}, 1000);
			setTimeout(() => {
				io.to(socket.id).emit("message", "please wait...");
			}, 2000);
		}

		try {
			await new Promise((resolve, reject) => {
				const interval_id = setInterval(() => {
					io.to(socket.id).emit("update queue position", Object.keys(queue).indexOf(socket.id));

					if (Object.keys(queue)[0] == socket.id) {
						clearInterval(interval_id);
						resolve();
					}
				}, 1000);
				queue[socket.id].interval_id = interval_id;
				queue[socket.id].reject = reject;
			});
		} catch (err) {
			(err != "socket disconnected" ? console.error(err) : null);
			return;
		}
		
		io.to(socket.id).emit("start");
		console.log(`start ${filename}`);
		io.to(socket.id).emit("message", `start ${filename}`);

		const spawn = child_process.spawn(`${backend}/virtual_environment/bin/python`, [
			"-u",
			`${backend}/model/transform.py`, transform_option, filename, text_color_hex, gradient_tone_hex, language_code
		]);

		spawn.stderr.on("data", (data) => {
			const python_stderr = data.toString();
			console.error(python_stderr);
		});

		spawn.stdout.on("data", (data) => {
			const python_stdout = data.toString();
			if (python_stdout != "\n") {
				console.log(python_stdout);
				io.to(socket.id).emit("message", python_stdout);
			}
		});

		spawn.on("exit", (exit_code) => {
			if (exit_code != 0 && queue[socket.id]) {
				console.error(`spawn process exited with code ${exit_code}`);
				io.to(socket.id).emit("message", `error: spawn process exited with code ${exit_code}`);

				file.purge(queue[socket.id].filename).catch((err) => null);
				queue[socket.id].reject("spawn error");
				delete queue[socket.id];

				return;
			}
			
			switch (transform_option) {
				case "no_ocr_dark":
				case "no_ocr_dark_retain_img_colors":
					const spawn = child_process.spawn("gs", [
						"-o", `${backend}/tempfiles/${filename}_no_text.pdf`,
						"-sDEVICE=pdfwrite",
						"-dFILTERTEXT",
						`${backend}/tempfiles/${filename}_in.pdf`
					]);
	
					spawn.on("exit", (exit_code) => {
						if (exit_code != 0 && queue[socket.id]) {
							console.error(`spawn process exited with code ${exit_code}`);
							io.to(socket.id).emit("message", `error: spawn process exited with code ${exit_code}`);
	
							file.purge(queue[socket.id].filename).catch((err) => null);
							queue[socket.id].reject("spawn error");
							delete queue[socket.id];
	
							return;
						}
	
						const spawn = child_process.spawn("java", [
							"-classpath", `${backend}/vendor/pdfbox CLI tool — v=2.0.22.jar`,
							`${backend}/model/overlay.java`, transform_option, filename
						]);
			
						spawn.stderr.on("data", (data) => {
							const java_stderr = data.toString();
							console.error(java_stderr);
						});
				
						spawn.stdout.on("data", (data) => {
							const java_stdout = data.toString();
							if (java_stdout != "\n") {
								console.log(java_stdout);
								io.to(socket.id).emit("message", java_stdout);
							}
						});
				
						spawn.on("exit", (exit_code) => {
							if (exit_code != 0 && queue[socket.id]) {
								console.error(`spawn process exited with code ${exit_code}`);
								io.to(socket.id).emit("message", `error: spawn process exited with code ${exit_code}`);
	
								file.purge(queue[socket.id].filename).catch((err) => null);
								queue[socket.id].reject("spawn error");
								delete queue[socket.id];
	
								return;
							}
							
							sql.add_conversion().catch((err) => console.error(err));
							
							io.to(socket.id).emit("download", filename);
						});
					});

					break;
				default:
					sql.add_conversion().catch((err) => console.error(err));
				
					io.to(socket.id).emit("download", filename);
					
					break;
			}
		});
	});

	socket.on("disconnect", () => {
		if (queue[socket.id]) {
			file.purge(queue[socket.id].filename).catch((err) => null);
			clearInterval(queue[socket.id].interval_id);
			queue[socket.id].reject("socket disconnected");
			delete queue[socket.id];
		}
	});
});

app_socket.on("connect", () => {
	console.log("connected as client to portals (localhost:1026)");
});

app_socket.on("update domain request info", (info) => {
	io.emit("update domain request info", domain_request_info = info);
});

app_socket.connect();

server.listen(Number.parseInt(process.env.PORT), "0.0.0.0", () => {
	console.log(`server (dark-mode-pdf) started on (localhost:${process.env.PORT})`);
});

process.on("beforeExit", async (exit_code) => {
	try {
		await sql.pool.end();
	} catch (err) {
		console.error(err);
	}
});
