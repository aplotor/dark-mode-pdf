let app_index = null;
const socket = io({ // triggers server's io.on connect
	path: `${app_index = document.getElementById("app_index").getAttribute("content")}/socket.io`
});

let filesize_limit = null;
let page_limit = null;
let queue_size = null;

const dropdown_btn = document.getElementById("dropdown_btn");
const dropdown_menu = document.getElementById("dropdown_menu");
const last24hours_total_wrapper = document.getElementById("last24hours_total_wrapper");
const last7days_total_wrapper = document.getElementById("last7days_total_wrapper");
const last30days_total_wrapper = document.getElementById("last30days_total_wrapper");
const last24hours_list_wrapper = document.getElementById("last24hours_list_wrapper");
const last7days_list_wrapper = document.getElementById("last7days_list_wrapper");
const last30days_list_wrapper = document.getElementById("last30days_list_wrapper");
const countdown_wrapper = document.getElementById("countdown_wrapper");
const progress = document.getElementById("progress");
const progress_wrapper = document.getElementById("progress_wrapper");
const progress_status = document.getElementById("progress_status");
const convert_btn = document.getElementById("convert_btn");
const loading_btn = document.getElementById("loading_btn");
const cancel_btn = document.getElementById("cancel_btn");
const alert_wrapper = document.getElementById("alert_wrapper");
const file_input_container = document.getElementById("file_input_container");
const file_input = document.getElementById("file_input");
const file_input_label = document.getElementById("file_input_label");
const terminal = document.getElementById("terminal");
const post_terminal_space = document.getElementById("post_terminal_space");
const messages = document.getElementById("messages");
const form_check_inputs = document.getElementsByClassName("form-check-input");
const no_ocr_dark_radio = document.getElementById("no_ocr_dark_radio");
const ocr_dark_radio = document.getElementById("ocr_dark_radio");
const dim_radio = document.getElementById("dim_radio");
const retain_img_colors_checkbox = document.getElementById("retain_img_colors_checkbox");
const text_color_1_checkbox = document.getElementById("text_color_1_checkbox");
const text_color_2_checkbox = document.getElementById("text_color_2_checkbox");
const color_picker_1 = document.getElementById("color_picker_1");
const color_picker_2 = document.getElementById("color_picker_2");
const language_checkbox = document.getElementById("language_checkbox");
const language_select = document.getElementById("language_select");
let language_select_btn = setTimeout(() => language_select_btn = document.getElementsByClassName("bs-placeholder")[0], 1000);
let language_select_dropdown = setTimeout(() => language_select_dropdown = document.getElementsByClassName("bootstrap-select")[0], 1000);
const jobs_queued_text = document.getElementById("jobs_queued_text");
const jobs_queued_wrapper = document.getElementById("jobs_queued_wrapper");
const queue_position_text = document.getElementById("queue_position_text");
const queue_position_wrapper = document.getElementById("queue_position_wrapper");
const dl = document.getElementById("dl");

if (document.cookie) {
	const light_mode = document.cookie.split("; ").find((cookie) => cookie.startsWith("light_mode")).split("=")[1];
	if (light_mode == "on") {
		document.documentElement.classList.add("invert");
		document.body.classList.add("light_mode");
		dropdown_btn.classList.add("anti_invert");
		dropdown_menu.classList.add("anti_invert");
		dropdown_menu.classList.add("light_mode");
		file_input_container.classList.add("anti_invert");
		color_picker_1.classList.add("anti_invert");
		color_picker_2.classList.add("anti_invert");
		alert_wrapper.classList.add("anti_invert");
		convert_btn.classList.add("anti_invert");
		[...form_check_inputs].forEach((form_check_input) => form_check_input.classList.add("anti_invert"));
		setTimeout(() => [...document.getElementById("language_select_container").children[0].children].forEach((child) => child.classList.add("anti_invert")), 1000);
	}
}

document.addEventListener("keydown", (evt) => {
	(evt.code == "Escape" ? setTimeout(() => (!dropdown_menu.classList.contains("show") ? dropdown_btn.blur() : null), 100) : null);

	setTimeout(() => {
		const no_results = document.getElementsByClassName("no-results")[0];
		(no_results && !no_results.classList.contains("d-none") ? no_results.classList.add("d-none") : null);

		(typeof language_select_dropdown != "number" && !language_select_dropdown.classList.contains("show") ? language_select_btn.blur() : null);
	}, 100);
});

document.addEventListener("click", (evt) => (evt.target.classList.contains("dropdown-item") || evt.target.parentElement.classList.contains("dropdown-item") ? language_select_btn.blur() : null));

setTimeout(() => {
	language_select_btn.addEventListener("click", (evt) => (!language_select_dropdown.classList.contains("show") ? language_select_btn.blur() : null));
}, 1000);

dropdown_btn.addEventListener("click", (evt) => {
	setTimeout(() => (!dropdown_menu.classList.contains("show") ? dropdown_btn.blur() : null), 100);

	setTimeout(() => {
		dropdown_menu.scrollIntoView({
			behavior: "smooth",
			block: "end"
		});
	}, 250);
});

file_input.addEventListener("input", (evt) => file_input_label.innerText = file_input.files[0].name);

no_ocr_dark_radio.addEventListener("click", (evt) => {
	text_color_1_checkbox.disabled = false;
	text_color_1_checkbox.checked = true;
	text_color_2_checkbox.disabled = true;
	text_color_2_checkbox.checked = false;
	retain_img_colors_checkbox.disabled = false;
	language_checkbox.disabled = true;
	language_checkbox.checked = false;

});

ocr_dark_radio.addEventListener("click", (evt) => {
	text_color_2_checkbox.disabled = false;
	text_color_2_checkbox.checked = true;
	text_color_1_checkbox.disabled = true;
	text_color_1_checkbox.checked = false;
	retain_img_colors_checkbox.disabled = true;
	retain_img_colors_checkbox.checked = false;
	language_checkbox.disabled = false;
	language_checkbox.checked = true;
});

dim_radio.addEventListener("click", (evt) => {
	text_color_1_checkbox.disabled = true;
	text_color_1_checkbox.checked = false;
	text_color_2_checkbox.disabled = true;
	text_color_2_checkbox.checked = false;
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
			reader.onloadend = function () {
				const match = reader.result.match(/\/Type[\s]*\/Page[^s]/g);
				(match ? resolve(match.length) : reject("no match"));
			}
			reader.onerror = function () {
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
	request.open("post", `${app_index}/upload`);
	request.responseType = "json";

	request.upload.addEventListener("progress", (evt) => {
		const loaded = evt.loaded;
		const total = evt.total;
		const percentage_complete = (loaded/total)*100;

		progress.setAttribute("style", `width: ${Math.floor(percentage_complete)}%`);
		progress_status.innerText = `${Math.floor(percentage_complete)}% uploaded`;
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
			setTimeout(() => {
				post_terminal_space.scrollIntoView({
					behavior: "smooth",
					block: "end"
				});
			}, 1000);

			let transform_option = document.querySelector("input[name='transform_option']:checked").value.replace("_radio", "");
			(transform_option == "no_ocr_dark" && retain_img_colors_checkbox.checked ? transform_option = "no_ocr_dark_retain_img_colors" : null);

			const color_hex = (text_color_1_checkbox.checked ? color_picker_1.value : color_picker_2.value);

			const language_code = (language_select.value == "" ? "eng" : language_select.value);
			
			socket.emit("enqueue", filename, transform_option, color_hex, language_code);

			queue_position_text.classList.remove("d-none");
		}
	}

	request.send(data);
});

socket.on("replace localhost with dev private ip", (dev_private_ip) => {
	const all_a_tags = document.getElementsByTagName("a");
	[...all_a_tags].forEach((a_tag) => a_tag.href = a_tag.href.replace("localhost", dev_private_ip));
});

socket.on("update countdown", (countdown) => countdown_wrapper.innerHTML = countdown);

socket.on("update domain request info", (domain_request_info) => {
	last24hours_total_wrapper.innerHTML = domain_request_info.last24hours_total;
	last7days_total_wrapper.innerHTML = domain_request_info.last7days_total;
	last30days_total_wrapper.innerHTML = domain_request_info.last30days_total;

	last24hours_list_wrapper.innerHTML = "";
	last7days_list_wrapper.innerHTML = "";
	last30days_list_wrapper.innerHTML = "";

	list_domain_request_info(domain_request_info.last24hours_countries, last24hours_list_wrapper);
	list_domain_request_info(domain_request_info.last7days_countries, last7days_list_wrapper);
	list_domain_request_info(domain_request_info.last30days_countries, last30days_list_wrapper);
});

socket.on("set limits", (limits) => {
	filesize_limit = limits[0];
	page_limit = limits[1];
});

socket.on("update jobs queued", (jobs_queued) => queue_size = jobs_queued_wrapper.innerHTML = jobs_queued);

socket.on("update queue position", (queue_position) => queue_position_wrapper.innerHTML = `${queue_position}/${queue_size}`);

socket.on("start", () => {
	jobs_queued_text.classList.remove("d-none");
	queue_position_text.classList.add("d-none");
});

socket.on("message", (message) => {
	remove_blinking_caret();
	output_message(message);
	add_blinking_caret();

	terminal.scrollTop = terminal.scrollHeight; // scroll down
});

socket.on("download", (filename) => {
	dl.href = `${app_index}/download?socket_id=${socket.id}&filename=${filename}`;
	dl.click();

	alert_wrapper.innerHTML = "";
});

function list_domain_request_info(countries_array, parent_ul) {
	let li = null;

	if (countries_array.length == 0) {
		return;
	} else if (countries_array.length <= 3) {
		countries_array.forEach((country) => {
			li = document.createElement("li");
			li.classList.add("mt-n1");
			li.innerHTML = `${country.clientCountryName}: ${country.requests}`;
			parent_ul.appendChild(li);
		});
	} else {
		countries_array.slice(0, 3).forEach((country) => {
			li = document.createElement("li");
			li.classList.add("mt-n1");
			li.innerHTML = `${country.clientCountryName}: ${country.requests}`;
			parent_ul.appendChild(li);
		});

		li = document.createElement("li");
		li.classList.add("mt-n1");
		li.innerHTML = `${countries_array.length - 3} more`;
		parent_ul.appendChild(li);
	}
}

function output_message(message) {
	const p = document.createElement("p");
	p.classList.add("mb-1");
	p.innerHTML = `> ${message}`;
	messages.appendChild(p);
}

function remove_blinking_caret() {
	messages.removeChild(document.getElementById("gt_sign"));
}

function add_blinking_caret() {
	const p = document.createElement("p");
	p.id = "gt_sign";
	p.classList.add("mb-1");
	p.innerHTML = "> <span id='blinking_caret'>|</span>";
	messages.appendChild(p);
}

function show_alert(message, type) {
	alert_wrapper.innerHTML = `
		<div id="alert" class="alert alert-${type} alert-dismissable fade show mt-2 mb-0 py-1" role="alert">
			<span id="alert_message_wrapper">${message}</span>
			<button class="close" type="button" data-dismiss="alert">
				<span>&times;</span>
			</button>
		</div>
	`;
}

function reset() {
	file_input.value = null;
	file_input.disabled = false;
	file_input_label.innerText = "choose file";
	convert_btn.classList.remove("d-none");
	loading_btn.classList.add("d-none");
	cancel_btn.classList.add("d-none");
	progress_wrapper.classList.add("d-none");
	progress.setAttribute("style", "width: 0%");
}
