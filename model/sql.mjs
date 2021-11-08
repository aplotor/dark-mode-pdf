const project_root = process.cwd();
const run_config = (project_root.toLowerCase().slice(0, 20) == "/mnt/c/users/j9108c/" ? "dev" : "prod");

const secrets = (run_config == "dev" ? (await import(`${project_root}/_secrets.mjs`)).dev : (await import(`${project_root}/_secrets.mjs`)).prod);

const node_pg = (await import("pg")).default;

const client = new node_pg.Client(secrets.sql_connection);

async function connect_to_db() {
	await client.connect();
	(run_config == "dev" ? console.log("connected to (test) sql db") : console.log("connected to (prod) sql db"));
}

async function init_db() {
	if (run_config == "dev") {
		const result = await client.query(
			"select table_name " +
			"from information_schema.tables " +
			"where table_schema = 'public' " +
				"and table_type = 'BASE TABLE';"
		);
		const all_tables = result.rows;
		await Promise.all(all_tables.map((table) => {
			client.query(
				`drop table ${table.table_name} cascade;`
			);
		}));
		console.log("dropped all tables");
	} else if (run_config == "prod") {
		console.log("kept all tables");
	}

	await client.query(
		"create table if not exists visit (" +
			"id int primary key, " +
			"count int not null" +
		");"
	);
	console.log("created table (visit) if not exist");
	await client.query(
		"insert into visit " +
		"values (0, 0) " +
		"on conflict do nothing;"
	);

	await client.query(
		"create table if not exists conversion (" +
			"id int primary key, " +
			"count int not null" +
		");"
	);
	console.log("created table (conversion) if not exist");
	await client.query(
		"insert into conversion " +
		"values (0, 0) " +
		"on conflict do nothing;"
	);
}

async function add_visit() {
	await client.query(
		"update visit " +
		"set count = count+1 " +
		"where id = 0;"
	);
}

async function add_conversion() {
	await client.query(
		"update conversion " +
		"set count = count+1 " +
		"where id = 0;"
	);
}

export {
	connect_to_db,
	init_db,
	add_visit,
	add_conversion
};
