let project_root = __dirname.split("/");
project_root.pop();
project_root = project_root.join("/");

const filesystem = require("fs");

async function purge(random_filename) {
	await Promise.all([
		filesystem.promises.unlink(`${project_root}/data/${random_filename}_in.pdf`),
		filesystem.promises.unlink(`${project_root}/data/${random_filename}_temp.pdf`),
		filesystem.promises.unlink(`${project_root}/data/${random_filename}_no_text.pdf`),
		filesystem.promises.unlink(`${project_root}/data/${random_filename}_out.pdf`)
	]);
}

let leftover_pdfs = [];

async function log_leftover_pdfs() {
	files = await filesystem.promises.readdir(`${project_root}/data`);
	files.forEach((file) => ((file.endsWith(".pdf")) ? leftover_pdfs.push(file) : null));
	// console.log("logged leftover pdfs");
}

async function delete_leftover_pdfs() {
	await Promise.all(leftover_pdfs.map((pdf) => filesystem.promises.unlink(`${project_root}/data/${pdf}`)));
	// console.log("deleted leftover pdfs");

	leftover_pdfs = [];
}

module.exports.purge = purge;
module.exports.log_leftover_pdfs = log_leftover_pdfs;
module.exports.delete_leftover_pdfs = delete_leftover_pdfs;
