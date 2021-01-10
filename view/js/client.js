let index = null;
const socket = io({path: `${index = document.getElementById("index").getAttribute("content")}/socket.io`}); // triggers controller's io.on connect

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
const all_elements = document.getElementsByTagName("*");

if (document.cookie != "") {
	const light_mode_preference = document.cookie.split("; ").find((cookie) => cookie.startsWith("light_mode")).split("=")[1];

	((light_mode_preference == "on") ? [...all_elements].forEach((element) => element.classList.add("light_mode")) : null);
}

file_input.addEventListener("input", (event) => {
	file_input_label.innerText = file_input.files[0].name;
});

convert_button.addEventListener("click", (event) => {
	if (!file_input.value) {
		show_alert("no file selected", "warning");
		return null;
	}

	const file = file_input.files[0];
	const file_name = file.name;
	const file_size = file.size; // in bytes

	if (file_name.split(".").pop().toLowerCase() != "pdf") {
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

	const random_file_name = Math.random().toString().substring(2, 17);

	const data = new FormData();
	data.append("file", file, random_file_name);

	const req = new XMLHttpRequest();
	req.responseType = "json";

	req.upload.addEventListener("progress", (event) => {
		const loaded = event.loaded;
		const total = event.total;
		const percentage_complete = (loaded/total)*100;

		progress.setAttribute("style", `width: ${Math.floor(percentage_complete)}%`);
		progress_status.innerText = `${Math.floor(percentage_complete)}% uploaded`;
	});

	req.addEventListener("load", (event) => {
		if (req.status == 200) {
			show_alert("file uploaded", "success");
		} else {
			show_alert("error uploading file", "danger");
		}

		reset();
	});

	req.addEventListener("error", (event) => {
		reset();
		show_alert("error uploading file", "danger");
	});

	req.addEventListener("abort", (event) => {
		reset();
		show_alert("upload cancelled", "primary");
	});

	cancel_button.addEventListener("click", (event) => {
		req.abort();
	});

	req.open("post", "/apps/dark-mode-pdf/upload");
	req.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) { // readystate 4 = data transfer complete
			const transform_option = document.querySelector("input[name='transform_option']:checked").value;
			socket.emit("transform", random_file_name, transform_option);
		}
	}
	req.send(data);
});

dropdown_button.addEventListener("click", (event) => {
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

socket.on("overlay", (random_file_name) => {
	socket.emit("overlay", random_file_name);
});

socket.on("download", (random_file_name) => {
	window.location = `${index}/download?socket_id=${socket.id}&random_file_name=${random_file_name}`;

	alert_wrapper.innerHTML = "";
});

socket.on("update domain request info", (today_total, last7days_total, last30days_total, today_countries, last7days_countries, last30days_countries) => {
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
