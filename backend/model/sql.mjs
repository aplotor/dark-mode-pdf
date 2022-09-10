const backend = process.cwd();

import node_pg from "pg";
import axios from "axios";

const pool = new node_pg.Pool({ // https://node-postgres.com/api/pool
	connectionString: process.env.SQL_CONNECTION,
	max: (process.env.RUN == "dev" ? 1 : 5),
	idleTimeoutMillis: 0
});

async function init_db() {
	const client = await pool.connect();
	try {
		await client.query(`begin;`);

		if (process.env.RUN == "dev") {
			const result = await client.query(`
				select 
					table_name 
				from 
					information_schema.tables 
				where 
					table_schema = 'public' 
					and table_type = 'BASE TABLE'
				;
			`);
			const all_tables = result.rows;
			await Promise.all(all_tables.map((table, idx, arr) => {
				client.query(`
					drop table 
						${table.table_name} 
					cascade
					;
				`);
			}));
			console.log("dropped all tables");
			console.log("recreating tables");
		}
	
		await client.query(`
			create table if not exists 
				conversion (
					id int primary key, 
					count int not null
				)
			;
		`);
		await client.query(`
			insert into 
				conversion 
			values 
				(0, 0) 
			on conflict (id) do 
				nothing
			;
		`);

		await client.query(`commit;`);
	} catch (err) {
		console.error(err);
		await client.query(`rollback;`);
	}
	client.release();
}

async function query(query) {
	const result = await pool.query(query);
	const rows = (result ? result.rows : null);
	return rows;
}

async function add_conversion() {
	await query(`
		update 
			conversion 
		set 
			count = count+1 
		where 
			id = 0
		;
	`);
}

async function backup_db() {
	await axios.post("https://api.elephantsql.com/api/backup", {}, {
		auth: {
			username: "",
			password: process.env.SQL_API_KEY
		}
	});
	console.log("backed up db");
}
function cycle_backup_db() {
	backup_db().catch((err) => console.error(err));

	setInterval(() => {
		backup_db().catch((err) => console.error(err));
	}, 86400000); // 24h
}

export {
	pool,
	init_db,
	add_conversion,
	cycle_backup_db
};
