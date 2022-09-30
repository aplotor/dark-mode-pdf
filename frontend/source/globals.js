import * as app_env from "$app/env";
import * as env_static_public from "$env/static/public";
import * as socket_io_client from "socket.io-client";

const readonly = {
	app_name: "dark-mode-pdf",
	description: "converts PDFs to dark mode",
	repo: "https://github.com/jc9108/dark-mode-pdf",
	backend: (env_static_public.RUN == "dev" ? "/backend" : ""),
	socket: socket_io_client.io((env_static_public.RUN == "dev" ? `http://${(app_env.browser ? window.location.hostname : "localhost")}:${Number.parseInt(env_static_public.PORT)+1}` : "")),
	portals: (env_static_public.RUN == "dev" ? `http://${(app_env.browser ? window.location.hostname : "localhost")}:1025` : "https://portals.sh")
};

export {
	readonly
};
