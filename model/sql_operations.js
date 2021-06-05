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

function connect_to_db() {
	return new Promise((resolve, reject) => {
		sql_client.connect((err) => ((err) ? reject(console.error(err)) : resolve(console.log("connected to sql db"))));
	});
}

function init_db(config) {
	new Promise((resolve, reject) => {
		if (config == "dev") {
			sql_client.query(
				"select table_name " +
				"from information_schema.tables " +
				"where table_schema='public' " +
					"and table_type='BASE TABLE';",
				(err, result) => {
					if (err) {
						reject(console.error(err));
					} else {
						result.rows.forEach((table) => {
							sql_client.query(
								`drop table ${table["table_name"]} cascade;`,
								(err, result) => ((err) ? reject(console.error(err)) : null)
							);
						});
	
						resolve(console.log("dropped all tables"));
					}
				}
			);
		} else if (config == "prod") {
			resolve(console.log("kept all tables"));
		}
	}).then(() => {
		sql_client.query(
			"create table if not exists visit (" +
				"id int primary key, " +
				"count int not null" +
			");",
			(err, result) => {
				if (err) {
					console.error(err);
				} else {
					console.log("created table if not exists visit");

					sql_client.query(
						"insert into visit " +
						"values (0, 0) " +
						"on conflict do nothing;",
						(err, result) => ((err) ? console.error(err) : null)
					);
				}
			}
		);
	
		sql_client.query(
			"create table if not exists conversion (" +
				"id int primary key, " +
				"count int not null" +
			");",
			(err, result) => {
				if (err) {
					console.error(err);
				} else {
					console.log("created table if not exists conversion");

					sql_client.query(
						"insert into conversion " +
						"values (0, 0) " +
						"on conflict do nothing;",
						(err, result) => ((err) ? console.error(err) : null)
					);
				}
			}
		);
	}).catch((err) => console.error(err));
}

function add_visit() {
	sql_client.query(
		"update visit " +
		"set count=count+1 " +
		"where id=0;",
		(err, result) => ((err) ? console.error(err) : null)
	);
}

function add_conversion() {
	sql_client.query(
		"update conversion " +
		"set count=count+1 " +
		"where id=0;",
		(err, result) => ((err) ? console.error(err) : null)
	);
}

module.exports.set_client = set_client;
module.exports.connect_to_db = connect_to_db;
module.exports.init_db = init_db;
module.exports.add_visit = add_visit;
module.exports.add_conversion = add_conversion;
