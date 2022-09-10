<script context="module">
	import * as globals from "frontend/source/globals.js";
	import Footer from "frontend/source/components/footer.svelte";

	import * as svelte from "svelte";

	const globals_r = globals.readonly;
	const globals_w = globals.writable;

	export async function load(obj) {
		let interval_id = null;
		try {
			await new Promise((resolve, reject) => {
				const timeout_id = setTimeout(() => {
					reject("socket connection attempt timed out");
				}, 5000);

				interval_id = setInterval(() => {
					if (globals_r.socket.connected) {
						clearTimeout(timeout_id);
						clearInterval(interval_id);
						resolve();
					}
				}, 100);
			});
			
			return {
				status: 200
			};
		} catch (err) {
			console.error(err);
			clearInterval(interval_id);

			return {
				status: 408
			};
		}
	};
</script>
<script>
	svelte.onMount(() => {
		globals_r.socket.emit("layout mounted");

		globals_r.socket.on("store all apps urls", (all_apps_urls) => {
			$globals_w.all_apps_urls = all_apps_urls;

			if (window.location.hostname.startsWith("192.168.")) {
				for (const app_name in all_apps_urls) {
					$globals_w.all_apps_urls[app_name].link = all_apps_urls[app_name].link.replace("localhost", window.location.hostname);
				}
			}
		});
	});
	svelte.onDestroy(() => {
		globals_r.socket.off("store all apps urls");
	});
</script>

<div class="container-fluid text-light">
	<div class="row d-flex justify-content-center">
		<content class="col-12 col-sm-11 col-md-10 col-lg-9 col-xl-8">
			<slot></slot>
			<div class="text-center my-4">
				<a href={globals_r.repo} target="_blank"><i id="bottom_gh" class="fab fa-github"></i></a>
			</div>
		</content>
		<Footer/>
	</div>
</div>
