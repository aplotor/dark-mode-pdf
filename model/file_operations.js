const project_root = process.cwd();

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
	files.forEach((file) => (file.endsWith(".pdf") ? leftover_pdfs.push(file) : null));
	// console.log("logged leftover pdfs");
}

async function delete_leftover_pdfs() {
	await Promise.all(leftover_pdfs.map((pdf) => filesystem.promises.unlink(`${project_root}/data/${pdf}`)));
	// console.log("deleted leftover pdfs");

	leftover_pdfs = [];
}

async function cleanup() {
	await delete_leftover_pdfs();
	log_leftover_pdfs();
	// console.log("cleanup completed");
}
function cycle_cleanup() {
	setInterval(() => cleanup().catch((err) => console.error(err)), 14400000); // 4h
}

module.exports.purge = purge;
module.exports.cleanup = cleanup;
module.exports.cycle_cleanup = cycle_cleanup;
