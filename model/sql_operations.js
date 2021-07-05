const project_root = process.cwd();
const run_config = (project_root.toLowerCase().slice(0, 20) == "/mnt/c/users/j9108c/" ? "dev" : "prod");

const secrets = (run_config == "dev" ? require(`${project_root}/_secrets.js`).dev : require(`${project_root}/_secrets.js`).prod);

const node_pg = require("pg");

const sql_client = new node_pg.Client(secrets.sql_connection);

async function connect_to_db() {
	await sql_client.connect();
	(run_config == "dev" ? console.log("connected to (test) sql db") : console.log("connected to (prod) sql db"));
}

async function init_db() {
	if (run_config == "dev") {
		const result = await sql_client.query(
			"select table_name " +
			"from information_schema.tables " +
			"where table_schema='public' " +
				"and table_type='BASE TABLE';"
		);
		const all_tables = result.rows;
		await Promise.all(all_tables.map((table) => {
			sql_client.query(
				`drop table ${table.table_name} cascade;`
			);
		}));
		console.log("dropped all tables");
	} else if (run_config == "prod") {
		console.log("kept all tables");
	}

	await sql_client.query(
		"create table if not exists visit (" +
			"id int primary key, " +
			"count int not null" +
		");"
	);
	console.log('created table (visit) if not exist');
	await sql_client.query(
		"insert into visit " +
		"values (0, 0) " +
		"on conflict do nothing;"
	);

	await sql_client.query(
		"create table if not exists conversion (" +
			"id int primary key, " +
			"count int not null" +
		");"
	);
	console.log('created table (conversion) if not exist');
	await sql_client.query(
		"insert into conversion " +
		"values (0, 0) " +
		"on conflict do nothing;"
	);
}

async function add_visit() {
	await sql_client.query(
		"update visit " +
		"set count=count+1 " +
		"where id=0;"
	);
}

async function add_conversion() {
	await sql_client.query(
		"update conversion " +
		"set count=count+1 " +
		"where id=0;"
	);
}

module.exports.connect_to_db = connect_to_db;
module.exports.init_db = init_db;
module.exports.add_visit = add_visit;
module.exports.add_conversion = add_conversion;
