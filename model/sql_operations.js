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
		sql_client.connect((error) => ((error) ? console.error(error) : resolve(console.log("connected to sql db"))));
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
				(error, result) => {
					if (error) {
						console.error(error);
					} else {
						result.rows.forEach((table) => {
							sql_client.query(
								`drop table ${table["table_name"]} cascade;`,
								(error, result) => ((error) ? console.error(error) : null)
							);
						});
	
						resolve("dropped all tables");
					}
				}
			);
		} else if (config == "prod") {
			resolve("kept all tables");
		}
	}).then((result) => {
		console.log(result);

		sql_client.query(
			"create table if not exists visit (" +
				"id int primary key, " +
				"count int not null" +
			");",
			(error, result) => {
				if (error) {
					console.error(error);
				} else {
					console.log("created table if not exists visit");

					sql_client.query(
						"insert into visit " +
						"values (0, 0) " +
						"on conflict do nothing;",
						(error, result) => ((error) ? console.error(error) : null)
					);
				}
			}
		);
	
		sql_client.query(
			"create table if not exists conversion (" +
				"id int primary key, " +
				"count int not null" +
			");",
			(error, result) => {
				if (error) {
					console.error(error);
				} else {
					console.log("created table if not exists conversion");

					sql_client.query(
						"insert into conversion " +
						"values (0, 0) " +
						"on conflict do nothing;",
						(error, result) => ((error) ? console.error(error) : null)
					);
				}
			}
		);
	}).catch((error) => console.error(error));
}

function add_visit() {
	sql_client.query(
		"update visit " +
		"set count=count+1 " +
		"where id=0;",
		(error, result) => ((error) ? console.error(error) : null)
	);
}

function add_conversion() {
	sql_client.query(
		"update conversion " +
		"set count=count+1 " +
		"where id=0;",
		(error, result) => ((error) ? console.error(error) : null)
	);
}

module.exports.set_client = set_client;
module.exports.connect_to_db = connect_to_db;
module.exports.init_db = init_db;
module.exports.add_visit = add_visit;
module.exports.add_conversion = add_conversion;
