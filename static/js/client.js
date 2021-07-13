let app_index = null;
const socket = io({ // triggers server's io.on connect
	path: `${app_index = document.getElementById("app_index").getAttribute("content")}/socket.io`
});

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
const convert_button = document.getElementById("convert_button");
const loading_button = document.getElementById("loading_button");
const cancel_button = document.getElementById("cancel_button");
const alert_wrapper = document.getElementById("alert_wrapper");
const file_input_container = document.getElementById("file_input_container");
const file_input = document.getElementById("file_input");
const file_input_label = document.getElementById("file_input_label");
const terminal = document.getElementById("terminal");
const post_terminal_space = document.getElementById("post_terminal_space");
const messages = document.getElementById("messages");
const form_check_inputs = document.getElementsByClassName("form-check-input");
const radio_no_ocr_dark = document.getElementById("no_ocr_dark");
const radio_ocr_dark = document.getElementById("ocr_dark");
const radio_dim = document.getElementById("dim");
const checkbox_retain_img_colors = document.getElementById("retain_img_colors");
const checkbox_text_color_1 = document.getElementById("text_color_1");
const checkbox_text_color_2 = document.getElementById("text_color_2");
const color_picker_1 = document.getElementById("color_picker_1");
const color_picker_2 = document.getElementById("color_picker_2");
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
		convert_button.classList.add("anti_invert");
		color_picker_1.classList.add("anti_invert");
		color_picker_2.classList.add("anti_invert");
		alert_wrapper.classList.add("anti_invert");
		[...form_check_inputs].forEach((form_check_input) => form_check_input.classList.add("anti_invert"));
	}
}

document.addEventListener("keydown", (evt) => (evt.code == "Escape" ? setTimeout(() => (!dropdown_menu.classList.contains("show") ? dropdown_btn.blur() : null), 100) : null));

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

radio_no_ocr_dark.addEventListener("click", (evt) => {
	checkbox_text_color_1.disabled = false;
	checkbox_text_color_1.checked = true;
	checkbox_text_color_2.disabled = true;
	checkbox_text_color_2.checked = false;
	checkbox_retain_img_colors.disabled = false;
});

radio_ocr_dark.addEventListener("click", (evt) => {
	checkbox_text_color_2.disabled = false;
	checkbox_text_color_2.checked = true;
	checkbox_text_color_1.disabled = true;
	checkbox_text_color_1.checked = false;
	checkbox_retain_img_colors.disabled = true;
	checkbox_retain_img_colors.checked = false;
});

radio_dim.addEventListener("click", (evt) => {
	checkbox_text_color_1.disabled = true;
	checkbox_text_color_1.checked = false;
	checkbox_text_color_2.disabled = true;
	checkbox_text_color_2.checked = false;
	checkbox_retain_img_colors.disabled = true;
	checkbox_retain_img_colors.checked = false;
});

convert_button.addEventListener("click", async (evt) => {
	let alert_message_wrapper = document.getElementById("alert_message_wrapper");
	if (alert_message_wrapper) {
		const alert_message = alert_message_wrapper.innerHTML;
		if (alert_message == "file uploaded" || alert_message == "current pdf incomplete") {
			show_alert("current pdf incomplete", "danger");
			return;
		}
	}

	if (!file_input.value) {
		show_alert("no file selected", "warning");
		return;
	}

	const file = file_input.files[0];
	const filename = file.name;
	const filesize = file.size; // in bytes

	if (filename.split(".").pop().toLowerCase() != "pdf") {
		show_alert("this is not a pdf file", "warning");
		return;
	}

	const filesize_limit = 5242880; // 5mb
	if (filesize > filesize_limit) {
		show_alert(`file size limit exceeded (${filesize_limit/1048576}mb)`, "warning");
		return;
	}

	const page_limit = 500;
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
		console.error(err);
		if (err != "no match") {
			show_alert("error", "danger");
			return;
		}
	}

	alert_wrapper.innerHTML = "";
	file_input.disabled = true;
	convert_button.classList.add("d-none");
	loading_button.classList.remove("d-none");
	cancel_button.classList.remove("d-none");
	progress_wrapper.classList.remove("d-none");

	const random_filename = Math.random().toString().substring(2, 17);

	const data = new FormData();
	data.append("file", file, random_filename);

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

	cancel_button.addEventListener("click", (evt) => request.abort());

	request.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			setTimeout(() => {
				post_terminal_space.scrollIntoView({
					behavior: "smooth",
					block: "end"
				});
			}, 1000);

			let transform_option = document.querySelector("input[name='transform_option']:checked").value;
			(transform_option == "no_ocr_dark" && checkbox_retain_img_colors.checked ? transform_option = "no_ocr_dark_retain_img_colors" : null);

			const color_hex = (checkbox_text_color_1.checked ? color_picker_1.value : color_picker_2.value);

			socket.emit("transform", transform_option, random_filename, color_hex);
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

socket.on("message", (message) => {
	remove_blinking_caret();
	output_message(message);
	add_blinking_caret();

	terminal.scrollTop = terminal.scrollHeight; // scroll down
});

socket.on("download", (random_filename) => {
	dl.href = `${app_index}/download?socket_id=${socket.id}&random_filename=${random_filename}`;
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
	p.classList.add("message");
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
	cancel_button.classList.add("d-none");
	loading_button.classList.add("d-none");
	convert_button.classList.remove("d-none");
	progress_wrapper.classList.add("d-none");
	progress.setAttribute("style", "width: 0%");
}
