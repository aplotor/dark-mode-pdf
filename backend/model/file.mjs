const backend = process.cwd();

import filesystem from "fs";

let leftover_pdfs = [];

function init() {
	(!filesystem.existsSync(`${backend}/tempfiles/`) ? filesystem.mkdirSync(`${backend}/tempfiles/`) : null);
}

async function purge(filename) {
	await Promise.all([
		filesystem.promises.unlink(`${backend}/tempfiles/${filename}_in.pdf`),
		filesystem.promises.unlink(`${backend}/tempfiles/${filename}_temp.pdf`),
		filesystem.promises.unlink(`${backend}/tempfiles/${filename}_no_text.pdf`),
		filesystem.promises.unlink(`${backend}/tempfiles/${filename}_out.pdf`)
	]);
}

async function log_leftover_pdfs() {
	const files = await filesystem.promises.readdir(`${backend}/tempfiles/`);
	for (const file of files) {
		(file.endsWith(".pdf") ? leftover_pdfs.push(file) : null);
	}
	// console.log("logged leftover pdfs");
}

async function delete_leftover_pdfs() {
	await Promise.all(leftover_pdfs.map((pdf) => filesystem.promises.unlink(`${backend}/tempfiles/${pdf}`)));
	// console.log("deleted leftover pdfs");

	leftover_pdfs = [];
}

async function cleanup(init=false) {
	(init ? await log_leftover_pdfs() : null);
	await delete_leftover_pdfs();
	log_leftover_pdfs();
	// console.log("cleanup completed");
}
function cycle_cleanup() {
	cleanup(true).catch((err) => console.error(err));

	setInterval(() => {
		cleanup().catch((err) => console.error(err));
	}, 14400000); // 4h
}

export {
	init,
	purge,
	cycle_cleanup
};
