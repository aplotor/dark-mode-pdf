<script context="module">
	import * as globals from "frontend/source/globals.js";

	import * as svelte from "svelte";

	const globals_r = globals.readonly;
</script>
<script>
	let filesize_limit = null;
	let page_limit = null;
	let queue_length = null;

	let [
		convert_btn,
		loading_btn,
		cancel_btn,
		alert_wrapper,
		progress_wrapper,
		progress_status,
		progress_bar,
		file_input,
		file_input_label,
		terminal,
		messages,
		post_terminal_space,
		jobs_queued_text,
		jobs_queued_wrapper,
		queue_position_text,
		queue_position_wrapper,
		no_ocr_dark_radio,
		ocr_dark_radio,
		dim_radio,
		retain_img_colors_checkbox,
		text_color_checkbox_1,
		text_color_checkbox_2,
		text_color_picker_1,
		text_color_picker_2,
		gradient_tone_checkbox_1,
		gradient_tone_checkbox_2,
		gradient_tone_picker_1,
		gradient_tone_picker_2,
		language_checkbox,
		language_select,
		language_select_btn,
		language_select_dropdown,
		dl
	] = [];
	svelte.onMount(() => {
		globals_r.socket.emit("navigation", "index");

		globals_r.socket.on("set limits", (limits) => {
			filesize_limit = limits[0];
			page_limit = limits[1];
		});

		globals_r.socket.on("update jobs queued", (jobs_queued) => {
			queue_length = jobs_queued_wrapper.innerHTML = jobs_queued;
		});

		globals_r.socket.on("update queue position", (queue_position) => {
			queue_position_wrapper.innerHTML = `${queue_position}/${queue_length}`;
		});

		globals_r.socket.on("start", () => {
			jobs_queued_text.classList.remove("d-none");
			queue_position_text.classList.add("d-none");
		});

		globals_r.socket.on("message", (message) => {
			remove_blinking_caret();
			output_message(message);
			add_blinking_caret();

			terminal.scrollTop = terminal.scrollHeight; // scroll down
		});

		globals_r.socket.on("download", (filename) => {
			dl.href = `${globals_r.backend}/download?socket_id=${globals_r.socket.id}&filename=${filename}`;
			dl.click();

			alert_wrapper.innerHTML = "";
		});

		jQuery(language_select).selectpicker();
		language_select_btn = document.getElementsByClassName("bs-placeholder")[0];
		language_select_dropdown = document.getElementsByClassName("bootstrap-select")[0];

		language_select_btn.addEventListener("click", (evt) => {
			(!language_select_dropdown.classList.contains("show") ? language_select_btn.blur() : null);
		});

		file_input.addEventListener("input", (evt) => {
			file_input_label.innerHTML = file_input.files[0].name;
		});

		no_ocr_dark_radio.addEventListener("click", (evt) => {
			text_color_checkbox_1.disabled = false;
			text_color_checkbox_1.checked = true;
			text_color_checkbox_2.disabled = true;
			text_color_checkbox_2.checked = false;
			gradient_tone_checkbox_1.disabled = false;
			gradient_tone_checkbox_1.checked = false;
			gradient_tone_checkbox_2.disabled = true;
			gradient_tone_checkbox_2.checked = false;
			retain_img_colors_checkbox.disabled = false;
			retain_img_colors_checkbox.checked = false;
			language_checkbox.disabled = true;
			language_checkbox.checked = false;
		});

		ocr_dark_radio.addEventListener("click", (evt) => {
			text_color_checkbox_2.disabled = false;
			text_color_checkbox_2.checked = true;
			text_color_checkbox_1.disabled = true;
			text_color_checkbox_1.checked = false;
			gradient_tone_checkbox_1.disabled = true;
			gradient_tone_checkbox_1.checked = false;
			gradient_tone_checkbox_2.disabled = false;
			gradient_tone_checkbox_2.checked = false;
			retain_img_colors_checkbox.disabled = true;
			retain_img_colors_checkbox.checked = false;
			language_checkbox.disabled = false;
			language_checkbox.checked = true;
		});

		dim_radio.addEventListener("click", (evt) => {
			text_color_checkbox_1.disabled = true;
			text_color_checkbox_1.checked = false;
			text_color_checkbox_2.disabled = true;
			text_color_checkbox_2.checked = false;
			gradient_tone_checkbox_1.disabled = true;
			gradient_tone_checkbox_1.checked = false;
			gradient_tone_checkbox_2.disabled = true;
			gradient_tone_checkbox_2.checked = false;
			retain_img_colors_checkbox.disabled = true;
			retain_img_colors_checkbox.checked = false;
			language_checkbox.disabled = true;
			language_checkbox.checked = false;
		});
		
		convert_btn.addEventListener("click", async (evt) => {
			const alert_message_wrapper = document.getElementById("alert_message_wrapper");
			if (alert_message_wrapper) {
				const alert_message = alert_message_wrapper.innerHTML;
				if (alert_message == "file uploaded" || alert_message == "current job incomplete") {
					show_alert("current job incomplete", "danger");
					return;
				}
			}

			if (!file_input.value) {
				show_alert("no file selected", "warning");
				return;
			}

			const file = file_input.files[0];
			let filename = file.name;
			const filesize = file.size; // in binary bytes
			
			if (filename.split(".").pop().toLowerCase() != "pdf") {
				show_alert("this is not a pdf file", "warning");
				return;
			}

			if (filesize > filesize_limit) {
				show_alert(`file size limit exceeded (${filesize_limit/1048576}mb)`, "warning");
				return;
			}

			try {
				const num_pages = await new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.readAsBinaryString(file);
					reader.onloadend = function (evt) {
						const match = reader.result.match(/\/Type[\s]*\/Page[^s]/g);
						(match ? resolve(match.length) : reject("no match"));
					}
					reader.onerror = function (evt) {
						reject(reader.error);
					}
				});
				if (num_pages > page_limit) {
					show_alert(`page limit exceeded (${page_limit})`, "warning");
					return;
				}
			} catch (err) {
				if (err != "no match") {
					console.error(err);
					show_alert("error", "danger");
					return;
				}
			}

			alert_wrapper.innerHTML = "";
			file_input.disabled = true;
			convert_btn.classList.add("d-none");
			loading_btn.classList.remove("d-none");
			cancel_btn.classList.remove("d-none");
			progress_wrapper.classList.remove("d-none");
			jobs_queued_text.classList.add("d-none");

			filename = Math.random().toString().substring(2, 17);

			const data = new FormData();
			data.append("file", file, filename);
			
			const request = new XMLHttpRequest();
			request.open("post", `${globals_r.backend}/upload`);
			request.responseType = "json";

			request.upload.addEventListener("progress", (evt) => {
				const loaded = evt.loaded;
				const total = evt.total;
				const percentage_complete = (loaded/total)*100;

				progress_bar.setAttribute("style", `width: ${Math.floor(percentage_complete)}%`);
				progress_status.innerHTML = `${Math.floor(percentage_complete)}% uploaded`;
			});

			request.addEventListener("load", (evt) => {
				reset();
				show_alert("file uploaded", "success");
			});

			request.addEventListener("error", (evt) => {
				reset();
				show_alert("error uploading file", "danger");
			});

			request.addEventListener("abort", (evt) => {
				reset();
				show_alert("upload cancelled", "primary");
			});

			cancel_btn.addEventListener("click", (evt) => request.abort());

			request.onreadystatechange = function () {
				if (this.readyState == 4 && this.status == 200) {
					post_terminal_space.scrollIntoView({
						behavior: "smooth",
						block: "end"
					});

					let transform_option = document.querySelector('input[name="transform_option"]:checked').value.replace("_radio", "");
					(transform_option == "no_ocr_dark" && retain_img_colors_checkbox.checked ? transform_option = "no_ocr_dark_retain_img_colors" : null);

					const text_color_hex = (text_color_checkbox_1.checked ? text_color_picker_1.value : text_color_picker_2.value);

					let gradient_tone_hex = null;
					if (gradient_tone_checkbox_1.checked) {
						gradient_tone_hex = gradient_tone_picker_1.value;
					} else if (gradient_tone_checkbox_2.checked) {
						gradient_tone_hex = gradient_tone_picker_2.value;
					}

					const language_code = (language_select.value == "" ? "eng" : language_select.value);
					
					globals_r.socket.emit("enqueue", filename, transform_option, text_color_hex, gradient_tone_hex, language_code);

					queue_position_text.classList.remove("d-none");
				}
			}

			request.send(data);
		});
	});
	svelte.onDestroy(() => {
		globals_r.socket.off("set limits");
		globals_r.socket.off("update jobs queued");
		globals_r.socket.off("update queue position");
		globals_r.socket.off("start");
		globals_r.socket.off("message");
		globals_r.socket.off("download");
	});

	function handle_body_click(evt) {
		(evt.target.classList.contains("dropdown-item") || evt.target.parentElement && evt.target.parentElement.classList.contains("dropdown-item") ? language_select_btn.blur() : null);
	}

	function handle_body_keydown(evt) {
		setTimeout(() => {
			const no_results = document.getElementsByClassName("no-results")[0];
			(no_results && !no_results.classList.contains("d-none") ? no_results.classList.add("d-none") : null);

			(!language_select_dropdown.classList.contains("show") ? language_select_btn.blur() : null);
		}, 100);
	}

	function output_message(message) {
		messages.insertAdjacentHTML("beforeend", `
			<p class="mb-1">> ${message}</p>
		`);
	}

	function remove_blinking_caret() {
		messages.removeChild(document.getElementById("gt_sign"));
	}

	function add_blinking_caret() {
		messages.insertAdjacentHTML("beforeend", `
			<p id="gt_sign" class="mb-1">> <span id="blinking_caret">|</span></p>
		`);
	}

	function show_alert(message, type) {
		alert_wrapper.innerHTML = `
			<div id="alert" class="alert alert-${type} alert-dismissable fade show mt-2 mb-0 py-1" role="alert">
				<span id="alert_message_wrapper">${message}</span>
				<button class="close" type="button" data-dismiss="alert"><span>&times;</span></button>
			</div>
		`;
	}

	function reset() {
		file_input.value = null;
		file_input.disabled = false;
		file_input_label.innerHTML = "choose file";
		convert_btn.classList.remove("d-none");
		loading_btn.classList.add("d-none");
		cancel_btn.classList.add("d-none");
		progress_wrapper.classList.add("d-none");
		progress_bar.setAttribute("style", "width: 0%");
	}
</script>

<svelte:body on:click={handle_body_click} on:keydown={handle_body_keydown}/>
<svelte:head>
	<title>{globals_r.app_name}</title>
	<meta name="description" content={globals_r.description}/>
</svelte:head>
<div class="row d-flex justify-content-center mt-4">
	<div class="col-12 col-sm-11 col-md-10 col-lg-9 col-xl-8">
		<div class="row d-flex justify-content-center">
			<div class="col-12 col-sm-11 col-md-10 col-lg-9 col-xl-8">
				<h1 class="mb-3">dark-mode-pdf</h1>
				<div class="form-group">
					<div class="custom-file">
						<input bind:this={file_input} class="custom-file-input" type="file" accept=".pdf" id="file_input"/>
						<label bind:this={file_input_label} for="file_input" class="custom-file-label text-left bg-light">choose file</label>
					</div>
				</div>
				<span>transform option</span>
			</div>
		</div>
	</div>
</div>
<div class="row d-flex justify-content-center">
	<div class="col-12 col-sm-11 col-md-10 col-lg-9 col-xl-8">
		<div class="row d-flex justify-content-center">
			<div class="col-12 col-sm-11 col-md-10 col-lg-9 col-xl-8 ml-3 pl-5">
				<div class="form-check p-0">
					<input bind:this={no_ocr_dark_radio} id="no_ocr_dark_radio" class="form-check-input" type="radio" name="transform_option" value="no_ocr_dark_radio" checked/>
					<label class="form-check-label" for="no_ocr_dark_radio"> dark mode (no OCR: digital docs)</label>
				</div>
				<div class="form-check ml-3 d-flex align-items-center">
					<input bind:this={text_color_checkbox_1} id="text_color_checkbox_1" class="form-check-input" type="checkbox" checked/>
					<label class="form-check-label" for="text_color_checkbox_1">+ text color: <input bind:this={text_color_picker_1} type="color" value="#ffffff"/></label>
				</div>
				<div class="form-check ml-3 d-flex align-items-center">
					<input bind:this={gradient_tone_checkbox_1} id="gradient_tone_checkbox_1" class="form-check-input" type="checkbox"/>
					<label class="form-check-label" for="gradient_tone_checkbox_1">+ gradient tone: <input bind:this={gradient_tone_picker_1} type="color" value="#f2caff"/></label>
				</div>
				<div class="form-check ml-3">
					<input bind:this={retain_img_colors_checkbox} id="retain_img_colors_checkbox" class="form-check-input" type="checkbox"/>
					<label class="form-check-label" for="retain_img_colors_checkbox">+ retain image colors (EXPERIMENTAL)</label>
				</div>
				<div class="form-check p-0">
					<input bind:this={ocr_dark_radio} id="ocr_dark_radio" class="form-check-input" type="radio" name="transform_option" value="ocr_dark_radio"/>
					<label class="form-check-label" for="ocr_dark_radio"> dark mode (OCR: scanned docs)</label>
				</div>
				<div class="form-check ml-3 d-flex align-items-center">
					<input bind:this={text_color_checkbox_2} id="text_color_checkbox_2" class="form-check-input" type="checkbox" disabled/>
					<label class="form-check-label" for="text_color_checkbox_2">+ text color: <input bind:this={text_color_picker_2} type="color" value="#ffffff"/></label>
				</div>
				<div class="form-check ml-3 d-flex align-items-center">
					<input bind:this={gradient_tone_checkbox_2} id="gradient_tone_checkbox_2" class="form-check-input" type="checkbox" disabled/>
					<label class="form-check-label" for="gradient_tone_checkbox_2">+ gradient tone: <input bind:this={gradient_tone_picker_2} type="color" value="#f2caff"/></label>
				</div>
				<div class="form-check ml-3">
					<input bind:this={language_checkbox} id="language_checkbox" class="form-check-input" type="checkbox" disabled/>
					<label class="form-check-label" for="language_checkbox">+ language: 
						<select bind:this={language_select} class="selectpicker" data-width="fit" data-size="5" data-live-search="true" title="english">
							<!-- https://github.com/tesseract-ocr/tessdoc/blob/main/Data-Files-in-different-versions.md -->
							<option value="afr">afrikaans</option>
							<option value="sqi">albanian</option>
							<option value="amh">amharic</option>
							<option value="ara">arabic</option>
							<option value="hye">armenian</option>
							<option value="asm">assamese</option>
							<option value="aze">azerbaijani</option>
							<option value="aze_cyrl">azerbaijani (cyrilic)</option>
							<option value="eus">basque</option>
							<option value="bel">belarusian</option>
							<option value="ben">bengali</option>
							<option value="bos">bosnian</option>
							<option value="bre">breton</option>
							<option value="bul">bulgarian</option>
							<option value="mya">burmese</option>
							<option value="cat">catalan / valencian</option>
							<option value="ceb">cebuano</option>
							<option value="chr">cherokee</option>
							<option value="chi_sim">chinese (simplified)</option>
							<option value="chi_tra">chinese (traditional)</option>
							<option value="cos">corsican</option>
							<option value="hrv">croatian</option>
							<option value="ces">czech</option>
							<option value="dan">danish</option>
							<option value="nld">dutch / flemish</option>
							<option value="dzo">dzongkha</option>
							<option value="eng">english</option>
							<option value="enm">english (middle ages)</option>
							<option value="epo">esperanto</option>
							<option value="est">estonian</option>
							<option value="fao">faroese</option>
							<option value="fil">filipino (tagalog)</option>
							<option value="fin">finnish</option>
							<option value="fra">french</option>
							<option value="frm">french (middle ages)</option>
							<option value="fry">frisian (western)</option>
							<option value="glg">galician</option>
							<option value="kat">georgian</option>
							<option value="kat_old">georgian (old)</option>
							<option value="deu">german</option>
							<option value="frk">german (fraktur)</option>
							<option value="ell">greek</option>
							<option value="grc">greek (ancient)</option>
							<option value="hat">haitian / creole</option>
							<option value="heb">hebrew</option>
							<option value="hin">hindi</option>
							<option value="hun">hungarian</option>
							<option value="isl">icelandic</option>
							<option value="ind">indonesian</option>
							<option value="iku">inuktitut</option>
							<option value="gle">irish</option>
							<option value="ita">italian</option>
							<option value="ita_old">italian (old)</option>
							<option value="jpn">japanese</option>
							<option value="jav">javanese</option>
							<option value="kan">kannada</option>
							<option value="kaz">kazakh</option>
							<option value="khm">khmer (central)</option>
							<option value="kor">korean</option>
							<option value="kor_vert">korean (vertical)</option>
							<option value="kmr">kurmanji</option>
							<option value="kir">kyrgyz / kirghiz</option>
							<option value="lao">lao</option>
							<option value="lat">latin</option>
							<option value="lav">latvian</option>
							<option value="lit">lithuanian</option>
							<option value="ltz">luxembourgish</option>
							<option value="mkd">macedonian</option>
							<option value="msa">malay</option>
							<option value="mal">malayalam</option>
							<option value="mlt">maltese</option>
							<option value="mri">maori</option>
							<option value="mar">marathi</option>
							<option value="equ">math / equations</option>
							<option value="mon">mongolian</option>
							<option value="nep">nepali</option>
							<option value="nor">norwegian</option>
							<option value="oci">occitan</option>
							<option value="ori">oriya</option>
							<option value="fas">persian</option>
							<option value="pol">polish</option>
							<option value="por">portuguese</option>
							<option value="pan">punjabi / panjabi</option>
							<option value="pus">pushto / pashto</option>
							<option value="que">quechua</option>
							<option value="ron">romanian / moldovan</option>
							<option value="rus">russian</option>
							<option value="san">sanskrit</option>
							<option value="gla">scottish (gaelic)</option>
							<option value="srp">serbian</option>
							<option value="srp_latn">serbian (latin)</option>
							<option value="snd">sindhi</option>
							<option value="sin">sinhala / sinhalese</option>
							<option value="slk">slovak</option>
							<option value="slv">slovenian</option>
							<option value="spa">spanish / castilian</option>
							<option value="spa_old">spanish / castilian (old)</option>
							<option value="sun">sundanese</option>
							<option value="swa">swahili</option>
							<option value="swe">swedish</option>
							<option value="syr">syriac</option>
							<option value="tgk">tajik</option>
							<option value="tam">tamil</option>
							<option value="tat">tatar</option>
							<option value="tel">telugu</option>
							<option value="tha">thai</option>
							<option value="bod">tibetan</option>
							<option value="tir">tigrinya</option>
							<option value="ton">tonga</option>
							<option value="tur">turkish</option>
							<option value="ukr">ukrainian</option>
							<option value="urd">urdu</option>
							<option value="uig">uyghur / uighur</option>
							<option value="uzb">uzbek</option>
							<option value="uzb_cyrl">uzbek (cyrilic)</option>
							<option value="vie">vietnamese</option>
							<option value="cym">welsh</option>
							<option value="yid">yiddish</option>
							<option value="yor">yoruba</option>
						</select>
					</label>
				</div>
				<div class="form-check p-0">
					<input bind:this={dim_radio} id="dim_radio" class="form-check-input" type="radio" name="transform_option" value="dim_radio"/>
					<label class="form-check-label" for="dim_radio"> dim</label>
				</div>
			</div>
		</div>
	</div>
</div>
<div class="row d-flex justify-content-center mt-2">
	<div class="col-12 col-sm-11 col-md-10 col-lg-9 col-xl-8">
		<div class="row d-flex justify-content-center">
			<div class="col-12 col-sm-11 col-md-10 col-lg-9 col-xl-8">
				<div class="row d-flex justify-content-center align-items-end">
					<div class="col-8 pr-0">
						<span bind:this={jobs_queued_text}>jobs queued: <span bind:this={jobs_queued_wrapper}>?</span></span>
						<span bind:this={queue_position_text} class="d-none">your queue position: <span bind:this={queue_position_wrapper}>?</span></span>
						<button bind:this={loading_btn} class="btn btn-primary d-none" type="button" disabled>
							<span class="spinner-border spinner-border-sm" role="status"><span class="sr-only">loading...</span></span>
						</button>
					</div>
					<div class="col-4 pl-0">
						<button bind:this={convert_btn} class="btn btn-primary float-right">convert</button>
						<button bind:this={cancel_btn} class="btn btn-secondary float-right d-none" type="button">cancel</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
<div class="row d-flex justify-content-center">
	<div class="col-12 col-sm-11 col-md-10 col-lg-9 col-xl-8">
		<div class="row d-flex justify-content-center">
			<div class="col-12 col-sm-11 col-md-10 col-lg-9 col-xl-8">
				<div bind:this={alert_wrapper}></div>
				<div bind:this={progress_wrapper} class="d-none">
					<span bind:this={progress_status}></span>
					<div class="progress mb-3">
						<div bind:this={progress_bar} class="progress-bar" role="progressbar" area-valuemin="0" area-valuemax="100"></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
<div class="row d-flex justify-content-center mt-2">
	<div class="col-12 col-sm-11 col-md-10 col-lg-9 col-xl-8">
		<div bind:this={terminal} class="rounded" id="terminal">
			<div bind:this={messages}>
				<p id="gt_sign">> <span id="blinking_caret">|</span></p>
			</div>
		</div>
		<div bind:this={post_terminal_space} class="pt-2"></div>
	</div>
</div>
<a bind:this={dl} class="d-none" download></a>
