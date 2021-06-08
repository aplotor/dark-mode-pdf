let index = null;
const socket = io({path: `${index = document.getElementById("index").getAttribute("content")}/socket.io`}); // triggers server's io.on connect

const progress = document.getElementById("progress");
const progress_wrapper = document.getElementById("progress_wrapper");
const progress_status = document.getElementById("progress_status");
const convert_button = document.getElementById("convert_button");
const loading_button = document.getElementById("loading_button");
const cancel_button = document.getElementById("cancel_button");
const alert_wrapper = document.getElementById("alert_wrapper");
const file_input = document.getElementById("file_input");
const file_input_label = document.getElementById("file_input_label");
const terminal = document.getElementById("terminal");
const messages = document.getElementById("messages");
const dropdown_button = document.getElementById("dropdown_button");
const dropdown_menu = document.getElementById("dropdown_menu");
const today_total_wrapper = document.getElementById("today_total_wrapper");
const last7days_total_wrapper = document.getElementById("last7days_total_wrapper");
const last30days_total_wrapper = document.getElementById("last30days_total_wrapper");
const today_list_wrapper = document.getElementById("today_list_wrapper");
const last7days_list_wrapper = document.getElementById("last7days_list_wrapper");
const last30days_list_wrapper = document.getElementById("last30days_list_wrapper");
const countdown_wrapper = document.getElementById("countdown_wrapper");
const checkbox_text_color_1 = document.getElementById("text_color_1");
const checkbox_text_color_2 = document.getElementById("text_color_2");
const color_picker_1 = document.getElementById("color_picker_1");
const color_picker_2 = document.getElementById("color_picker_2");
const radio_no_ocr_dark = document.getElementById("no_ocr_dark");
const radio_ocr_dark = document.getElementById("ocr_dark");
const radio_dim = document.getElementById("dim");
const checkbox_retain_img_colors = document.getElementById("retain_img_colors");
const post_terminal_space = document.getElementById("post_terminal_space");
const all_elements = document.getElementsByTagName("*");

if (document.cookie != "") {
	const light_mode_preference = document.cookie.split("; ").find((cookie) => cookie.startsWith("light_mode")).split("=")[1];

	((light_mode_preference == "on") ? [...all_elements].forEach((element) => element.classList.add("light_mode")) : null);
}

file_input.addEventListener("input", (evt) => {
	file_input_label.innerText = file_input.files[0].name;
});

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

convert_button.addEventListener("click", (evt) => {
	if (!file_input.value) {
		show_alert("no file selected", "warning");
		return null;
	}

	const file = file_input.files[0];
	const filename = file.name;
	const file_size = file.size; // in bytes

	if (filename.split(".").pop().toLowerCase() != "pdf") {
		show_alert("this is not a pdf file", "warning");
		return null;
	}

	const file_size_limit = 5242880; // 5mb
	if (file_size > file_size_limit) {
		show_alert(`file size limit exceeded (${file_size_limit/1048576}mb)`, "warning");
		return null;
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

	const req = new XMLHttpRequest();
	req.open("post", "/apps/dark-mode-pdf/upload");
	req.responseType = "json";

	req.upload.addEventListener("progress", (evt) => {
		const loaded = evt.loaded;
		const total = evt.total;
		const percentage_complete = (loaded/total)*100;

		progress.setAttribute("style", `width: ${Math.floor(percentage_complete)}%`);
		progress_status.innerText = `${Math.floor(percentage_complete)}% uploaded`;
	});

	req.addEventListener("load", (evt) => {
		reset();
		show_alert("file uploaded", "success");
	});

	req.addEventListener("error", (evt) => {
		reset();
		show_alert("error uploading file", "danger");
	});

	req.addEventListener("abort", (evt) => {
		reset();
		show_alert("upload cancelled", "primary");
	});

	cancel_button.addEventListener("click", (evt) => {
		req.abort();
	});

	req.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			setTimeout(() => {
				post_terminal_space.scrollIntoView({
					behavior: "smooth",
					block: "end"
				});
			}, 500);

			let transform_option = document.querySelector("input[name='transform_option']:checked").value;
			((transform_option == "no_ocr_dark" && checkbox_retain_img_colors.checked) ? transform_option = "no_ocr_dark_retain_img_colors" : null);

			let color_hex = null;
			((checkbox_text_color_1.checked) ? color_hex = color_picker_1.value : color_hex = color_picker_2.value);

			socket.emit("transform", transform_option, random_filename, color_hex);
		}
	}

	req.send(data);
});

dropdown_button.addEventListener("click", (evt) => {
	setTimeout(() => dropdown_menu.scrollIntoView({behavior: "smooth"}), 250);
});

socket.on("replace localhost with dev private ip", (dev_private_ip) => {
	const all_a_tags = document.getElementsByTagName("a");

	[...all_a_tags].forEach((a_tag) => a_tag.href = a_tag.href.replace("localhost", dev_private_ip));
});

socket.on("message", (message) => {
	remove_blinking_caret();
	output_message(message);
	add_blinking_caret();

	terminal.scrollTop = terminal.scrollHeight; // scroll down
});

socket.on("download", (random_filename) => {
	window.location = `${index}/download?socket_id=${socket.id}&random_filename=${random_filename}`;

	alert_wrapper.innerHTML = "";
});

socket.on("update domain request info", (stats) => {
	today_total = stats[0];
	last7days_total = stats[1];
	last30days_total = stats[2];
	today_countries = stats[3];
	last7days_countries = stats[4];
	last30days_countries = stats[5];

	today_total_wrapper.innerHTML = today_total;
	last7days_total_wrapper.innerHTML = last7days_total;
	last30days_total_wrapper.innerHTML = last30days_total;

	today_list_wrapper.innerHTML= "";
	last7days_list_wrapper.innerHTML= "";
	last30days_list_wrapper.innerHTML = "";

	list_domain_request_info(today_countries, today_list_wrapper);
	list_domain_request_info(last7days_countries, last7days_list_wrapper);
	list_domain_request_info(last30days_countries, last30days_list_wrapper);
});

socket.on("update countdown", (countdown) => {
	countdown_wrapper.innerHTML = countdown;
});

function show_alert(message, alert) {
	alert_wrapper.innerHTML = `
		<div id="alert" class="alert alert-${alert} alert-dismissable fade show mt-2 mb-0 pt-1 pb-1" role="alert">
			<span>${message}</span>
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

function list_domain_request_info(countries_array, parent_ul) {
	let li = null;

	if (countries_array.length == 0) {
		return;
	} else if (countries_array.length <= 3) {
		countries_array.forEach((country) => {
			li = document.createElement("li");
			li.classList.add("mt-n1");
			li.innerHTML = `${country["clientCountryName"]}: ${country["requests"]}`;
			parent_ul.appendChild(li);
		});
	} else {
		countries_array.slice(0, 3).forEach((country) => {
			li = document.createElement("li");
			li.classList.add("mt-n1");
			li.innerHTML = `${country["clientCountryName"]}: ${country["requests"]}`;
			parent_ul.appendChild(li);
		});

		li = document.createElement("li");
		li.classList.add("mt-n1");
		li.innerHTML = `${countries_array.length - 3} more`;
		parent_ul.appendChild(li);
	}
}
