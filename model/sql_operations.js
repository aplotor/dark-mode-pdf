let project_root = __dirname.split("/");
project_root.pop();
project_root = project_root.join("/");

const secrets = require(`${project_root}/_secrets.js`);

const node_pg = require("pg");

let sql_client = null;

function set_client(config) {
	if (config == "dev") {
		sql_client = new node_pg.Client(secrets.sql_connection_test);
	} else if (config == "prod") {
		sql_client = new node_pg.Client(secrets.sql_connection_prod);
	}
}

async function connect_to_db() {
	await sql_client.connect();
	console.log("connected to sql db");
}

async function init_db(config) {
	if (config == "dev") {
		const result = await sql_client.query(
			"select table_name " +
			"from information_schema.tables " +
			"where table_schema='public' " +
				"and table_type='BASE TABLE';"
		);
		const all_tables = result.rows;
		await Promise.all(all_tables.map((table) => {
			sql_client.query(
				`drop table ${table["table_name"]} cascade;`
			);
		}));
		console.log("dropped all tables");
	} else if (config == "prod") {
		console.log("kept all tables");
	}

	await sql_client.query(
		"create table if not exists visit (" +
			"id int primary key, " +
			"count int not null" +
		");"
	);
	console.log('created table "visit" if not exist');
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
	console.log('created table "conversion" if not exist');
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

module.exports.set_client = set_client;
module.exports.connect_to_db = connect_to_db;
module.exports.init_db = init_db;
module.exports.add_visit = add_visit;
module.exports.add_conversion = add_conversion;
