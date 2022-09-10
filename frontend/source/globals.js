import * as app_env from "$app/env";
import * as env_static_public from "$env/static/public";
import * as store from "svelte/store";
import * as socket_io_client from "socket.io-client";

const readonly = {
	app_name: "dark-mode-pdf",
	description: "converts PDFs to dark mode",
	repo: "https://github.com/jc9108/dark-mode-pdf",
	sponsor_url: "https://github.com/sponsors/jc9108",
	backend: (env_static_public.RUN == "dev" ? "/backend" : ""),
	socket: socket_io_client.io((env_static_public.RUN == "dev" ? `http://${(app_env.browser ? window.location.hostname : "localhost")}:${Number.parseInt(env_static_public.PORT)+1}` : ""))
};

const writable = store.writable({
	all_apps_urls: null
});

export {
	readonly,
	writable
};
