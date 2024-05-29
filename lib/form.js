import { getCookie, setCookie, deleteCookie } from './cookie';
import { createRequest } from './calltouch';
import { reachGoal, getFormDataObject } from './analytics';

export const noValidPhone = (phoneValue) => {
	return ([...new Set(phoneValue.replace(/^(\+7)/g, "").replace(/\D/g, ""))].length === 1);
};

export function maskphone(e) {
	let num = this.value.replace(/^(\+7|8|7)/g, "").replace(/\D/g, "").split(/(?=.)/),
		i = num.length;

	if(this.value != "" && this.value != "+") {
		if (0 <= i) num.unshift("+7");
		if (1 <= i) num.splice(1, 0, " ");
		if (4 <= i) num.splice(5, 0, " ");
		if (7 <= i) num.splice(9, 0, "-");
		if (9 <= i) num.splice(12, 0, "-");
		this.value = num.join("");
	}
}


export const phoneChecker = (phone) => {
	let form = phone.closest("form"),
		btn = form.querySelector('[type="submit"]');
	if (!phone.value.length) {
		showErrorMes(form, ".phone", "Телефон является обязательным полем");
		stateBtn(btn, "Отправить");
		return false;
	} else {
		const phoneRe = new RegExp(/^\+7 [0-9]{3} [0-9]{3}-[0-9]{2}-[0-9]{2}$/);
		if (!phoneRe.test(phone.value) || noValidPhone(phone.value)) {
			showErrorMes(form, ".phone", "Введен некорректный номер телефона");
			stateBtn(btn, "Отправить");
			return false;
		}
	}
	showErrorMes(form, ".phone", "");
	return true;
};

document.querySelectorAll("input[name=phone]").forEach(function (element) {
	// element.addEventListener("focus", maskphone);
	element.addEventListener("input", maskphone);
	element.addEventListener("change", () => phoneChecker(element));
});

// AGREE CHECKBOX
// Проверка на состояние чекбокса, показ/скрытие ошибки
document.querySelectorAll("input[name=agree]").forEach(function (element) {
	let errorMes = element.parentElement.querySelector(".agree");
	element.addEventListener("change", (e) => {
		if (!e.target.checked) {
			errorMes.classList.remove("hidden");
		} else {
			errorMes.classList.add("hidden");
		}
	});
});

// TEXTAREA
const minLengthTextareaField = 10; // минимальное кол-во символов
// проверка на минимальное кол-во символов и скрытие ошибки
const checkTextareaLength = (textarea, minLength) => {
	if (textarea.value.length >= minLength) {
		textarea.nextSibling.nextElementSibling.classList.add("hidden");
	}
};

// CHANGE textarea для всез браузеров
document.querySelectorAll("textarea").forEach(function (textarea) {
	if (textarea.addEventListener) {
		textarea.addEventListener(
			"input",
			function () {
				// event handling code for sane browsers
				checkTextareaLength(textarea, minLengthTextareaField);
			},
			false
		);
	} else if (textarea.attachEvent) {
		textarea.attachEvent("onpropertychange", function () {
			// IE-specific event handling code
			checkTextareaLength(textarea, minLengthTextareaField);
		});
	}
});

// BUTTON
// Состояние кнопки
const stateBtn = (btn, value, disable = false) => {
	if (btn.tagName == 'INPUT') {
		btn.value = value;
		btn.disabled = disable;
	} else {
		btn.innerText = value;
		if (disable) {
			btn.setAttribute('disabled', true);
		} else {
			btn.removeAttribute('disabled');
		}
	}
};

const showErrorMes = (form, el, text) => {
	let field = form.querySelector(el);
	field.innerText = text;
	field.classList.remove("hidden");
};

const showMessageModal = (messageModal, icon, message) => {
	document.querySelectorAll(".modal-overlay").forEach((el) => {
		el.classList.add("hidden");
	});
	messageModal.querySelector("#icon").innerHTML = icon;
	messageModal.querySelector("p").innerHTML = message;
	messageModal.classList.remove("hidden");
};

export const connectForms = (url, callback, callback_error, ct_routeKey = '', verbose = false) => {

async function submitForm(form){
	const btn = form.querySelector('[type="submit"]');
	stateBtn(btn, "Отправляем...", true);
	const agree = form.querySelector('[name="agree"]');
	const phone = form.querySelector('[name="phone"]');
	const errorIcon =
		'<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><path fill="#ed1c24" d="M26,0A26,26,0,1,0,52,26,26,26,0,0,0,26,0Zm9.6,17.5a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2Zm-19.2,0a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2ZM39.65,40.69a.93.93,0,0,1-.45.11,1,1,0,0,1-.89-.55,13.81,13.81,0,0,0-24.62,0,1,1,0,1,1-1.78-.9,15.8,15.8,0,0,1,28.18,0A1,1,0,0,1,39.65,40.69Z"></path></svg>';
	const successIcon =
		'<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><path fill="#279548" d="M26,0A26,26,0,1,0,52,26,26,26,0,0,0,26,0Zm9.6,17.5a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2Zm-19.2,0a2,2,0,1,1-2,2A2,2,0,0,1,16.4,17.5ZM40.09,32.15a15.8,15.8,0,0,1-28.18,0,1,1,0,0,1,1.78-.9,13.81,13.81,0,0,0,24.62,0,1,1,0,1,1,1.78.9Z"></path></svg>';
	const errorText =
		'<b class="text-bold block text-2xl mb-4">Упс!</b> Что-то пошло не так. Перезагрузите страницу и попробуйте снова. ';
	const successText = '<b class="text-bold block text-2xl mb-4">Спасибо!</b> В скором времени мы свяжемся с Вами!';
	const messageModal = document.getElementById("message-modal");

	if (!phoneChecker(phone)) {
		return;
	}

	// если флажок не установлен - фронт
	if (!agree.checked) {
		showErrorMes(form, ".agree", "Чтобы продолжить, установите флажок");
		stateBtn(btn, "Отправить");
		return;
	}

	// Отпрвка цели что форма submit только после всех проверок
	//reachGoal("form_submit");

	let formData = new FormData(form);
	if(getCookie('fta')) {
		formData.append("fta", true);
	}
	if(getCookie('__gtm_campaign_url')) {
		let source = new URL(getCookie('__gtm_campaign_url'));
		source.search.slice(1).split("&").forEach(function(pair) {
			let param = pair.split("=");
			formData.append(param[0], param[1]);
		});
	}
	formData.append(
		"page_url",
		window.location.origin + window.location.pathname
	);

	if(typeof window.re != 'undefined') {
		formData.append("re", window.re);
	}

	window.location.search
		.slice(1)
		.split("&")
		.forEach(function (pair) {
			let param = pair.split("=");
			if(formData.get(param[0])){
				formData.set(param[0], decodeURIComponent(param[1]));
			} else {
				formData.append(param[0], decodeURIComponent(param[1]));
			}
		});

	let formDataObj = {};
	try {
		// Отправка заявки на обратный возов в CallTouch
		if(ct_routeKey != '') {
			const requestData = await createRequest(ct_routeKey, phone.value, verbose);
			formData.append("ct_callback", true);
			formData.append("ctw_createRequest", JSON.stringify(requestData));
		} else {
			throw new Error('Empty ct_routeKey');
		}
	} catch (error) {
		if(ct_routeKey != '') {
			formData.append("ctw_createRequest", error);
		}
		verbose && console.error("Error during request Calltouch callback:", error);
		formDataObj = getFormDataObject(formData, form.id);
	}

	const params = new URLSearchParams([...formData]);

	await fetch(url, {
		method: "POST",
		mode: "cors",
		cache: "no-cache",
		credentials: "same-origin",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: params,
	})
		.then((res) => res.json())
		.then((data) => {
			verbose && console.log(data);
			stateBtn(btn, "Отправить");
			if (data.answer == "required") {
				reachGoal("form_required");
				showErrorMes(form, data.field, data.message);
				return;
			} else if (data.answer == "error") {
				reachGoal("form_error");

				// Вызов callback_error при ошибке
				if (callback_error && typeof callback_error === 'function') {
					callback_error();
				} else if (messageModal) {
					setCookie('SEND_MAIL', true, {'domain': window.location.hostname,'path':'/','expires':600});
					showMessageModal(messageModal, errorIcon, errorText + "<br>" + data.error);
				}
				return;
			} else {
				reachGoal("form_success", formDataObj);

				// Вызов callback при успехе
				if (callback && typeof callback === 'function') {
					callback();
				} else if (messageModal) {
					setCookie('SEND_MAIL', true, {'domain': window.location.hostname,'path':'/','expires':600});
					showMessageModal(messageModal, successIcon, successText);
				}
			}
			form.reset();
		})
		.catch((error) => {
			reachGoal("form_error");
			console.error("Ошибка отправки данных формы: " + error);
			deleteCookie('SEND_MAIL');
			// Вызов callback_error при ошибке
			if (callback_error && typeof callback_error === 'function') {
				callback_error();
			} else if (messageModal) {
				showMessageModal(messageModal, errorIcon, errorText + "<br>" + error);
			}
			stateBtn(btn, "Отправить");
		});
	return false;
}

async function sendForm(form) {
	if (getCookie('SEND_MAIL')) {
		const confirmModal = document.getElementById('confirm-modal');
		if (confirmModal) {
			confirmModal.querySelector('p').innerText = 'Вы уже оставляли заявку сегодня, с вами обязательно свяжутся в ближайшее время!';
			confirmModal.classList.remove("hidden");

			const accept = confirmModal.querySelector('#accept-confirm');
			const acceptClose = confirmModal.querySelector('#accept-close');

			accept.addEventListener('click', async () => {
				console.log("5 accept click");
				// Закрываем модальное окно
				confirmModal.classList.add("hidden");
				// Удаляем куку
				document.cookie = 'SEND_MAIL=; Max-Age=-99999999;';
				// Повторно отправляем форму
				await submitForm(form);
				return;
			});

			acceptClose.addEventListener('click', () => {
				console.log("6 acceptClose click");
				// Закрываем модальное окно
				confirmModal.classList.add("hidden");
			});
			return;
		}
	}else{
		// Если куки нет, просто отправляем форму
		await submitForm(form);
		return;
	}
}

// Отправка всех форм
document.querySelectorAll("form").forEach((form) => {
	form.addEventListener('submit', async (event) => {		
		event.preventDefault();
		console.log("1 sendForm");
		await sendForm(form);
	})
});

}