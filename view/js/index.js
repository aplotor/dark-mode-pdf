const socket = io(); // triggers backend io.on"connect"

socket.on("message", (message) => {
	remove_blink_line();

	console.log(message);
	output_message(message);

	add_blink_line();

	terminal.scrollTop = terminal.scrollHeight; // scroll down
});

socket.on("download", (random_file_name) => {
	window.location = `/download?socket_id=${socket.id}&random_file_name=${random_file_name}`;

	alert_wrapper.innerHTML = "";
});

socket.on("update_visit_count", (visit_count) => {
	domain_visits.innerHTML = `domain visits: ${visit_count}`;
});

const progress = document.getElementById("progress");
const progress_wrapper = document.getElementById("progress_wrapper");
const progress_status = document.getElementById("progress_status");

const convert_button = document.getElementById("convert_button");
const loading_button = document.getElementById("loading_button");
const cancel_button = document.getElementById("cancel_button");

const alert_wrapper = document.getElementById("alert_wrapper");

const file_input = document.getElementById("file_input");
const file_input_label = document.getElementById("file_input_label");

const domain_visits = document.getElementById("domain_visits");

function show_alert(message, alert) {
	alert_wrapper.innerHTML = `
		<div id="alert" class="alert alert-${alert} alert-dismissable fade show m-0 pt-1 pb-1" role="alert">
			<span>${message}</span>
			<button class="close" type="button" data-dismiss="alert" aria-label="close">
				<span aria-hidden="true">&times;</span>
			</button>
		</div>
	`;
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

	const file_size_limit = 15728640; // 15mb
	if (file_size > file_size_limit) {
		show_alert(`file size limit exceeded (${file_size_limit/1048576}mb)`, "warning");
		return null;
	}

	const data = new FormData();
	const req = new XMLHttpRequest();
	req.responseType = "json";

	alert_wrapper.innerHTML = "";
	file_input.disabled = true;
	convert_button.classList.add("d-none");
	loading_button.classList.remove("d-none");
	cancel_button.classList.remove("d-none");
	progress_wrapper.classList.remove("d-none");

	const random_file_name = Math.random().toString().substring(2, 17);

	document.cookie = `filesize=${file_size}`;
	data.append("file", file, random_file_name);

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

	req.open("post", "/");
	req.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) { // readystate 4 = data transfer complete
			const transform_option = document.querySelector("input[name='transform_option']:checked").value;
			socket.emit("transform", random_file_name, transform_option);
		}
	}
	req.send(data);
});

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

const terminal = document.querySelector(".terminal");
const messages = document.querySelector(".messages");

function output_message(message) {
	const div = document.createElement("div");
	div.classList.add("message");
	div.innerHTML = `
		<p>> ${message}</p>
	`;
	messages.appendChild(div);
}

function remove_blink_line() {
	messages.removeChild(document.getElementById("gt_sign"));
}

function add_blink_line() {
	const p = document.createElement("p");
	p.id = "gt_sign";
	p.classList.add("white_text");
	p.innerHTML = `
		> <span class="blinking_cursor">|</span>
	`;
	messages.appendChild(p);
}
