const backend = process.cwd();

import filesystem from "fs";

let leftover_files = [];

async function init() {
	for (const dir of [`${backend}/logs/`, `${backend}/tempfiles/`]) {
		if (filesystem.existsSync(dir)) {
			if (process.env.RUN == "dev") {
				const files = await filesystem.promises.readdir(dir);
				await Promise.all(files.map((file, idx, arr) => (dir == `${backend}/logs/` ? filesystem.promises.truncate(`${dir}/${file}`.replace("//", "/"), 0) : filesystem.promises.unlink(`${dir}/${file}`.replace("//", "/")))));
			}
		} else {
			filesystem.mkdirSync(dir);
		}
	}
}

async function purge(filename) {
	await Promise.all([`${filename}_in`, `${filename}_temp`, `${filename}_no_text`, `${filename}_out`].map((full_filename, idx, arr) => filesystem.promises.unlink(`${backend}/tempfiles/${full_filename}.pdf`)));
}

async function track_leftover_files() {
	leftover_files = await filesystem.promises.readdir(`${backend}/tempfiles/`);
}

async function delete_leftover_files() {
	await Promise.all(leftover_files.map((file, idx, arr) => filesystem.promises.unlink(`${backend}/tempfiles/${file}`)));
	leftover_files = [];
}

async function cleanup() {
	await delete_leftover_files();
	await track_leftover_files();
}
function cycle_cleanup() {
	cleanup().catch((err) => console.error(err));

	setInterval(() => {
		cleanup().catch((err) => console.error(err));
	}, 14400000); // 4h
}

export {
	init,
	purge,
	cycle_cleanup
};
