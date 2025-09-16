import { getCookie, setCookie, deleteCookie, setAgreeCookie } from './cookie';
import { createRequest } from './calltouch';
import { reachGoal, getFormDataObject } from './analytics';

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

export const showErrorMes = (form, el, text) => {
	let field = form.querySelector(el);
	field.innerText = text;
	field.classList.remove("hidden");
};

export const showMessageModal = (messageModal, icon, message) => {
	document.querySelectorAll(".modal-overlay").forEach((el) => {
		el.classList.add("hidden");
	});
	if(messageModal){
		messageModal.querySelector("#icon").innerHTML = icon;
		messageModal.querySelector("p").innerHTML = message;
		messageModal.classList.remove("hidden");
	}
};

const propsParams = {
	callback: null,
	callback_error: null,
	validation: null,
	ct_routeKey: '',
	confirmModalText: '',
	verbose: false,
	agreeSelector: "agree",
	sendMailCookie: "SEND_MAIL",
}

export const errorIcon = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><path fill="#ed1c24" d="M26,0A26,26,0,1,0,52,26,26,26,0,0,0,26,0Zm9.6,17.5a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2Zm-19.2,0a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2ZM39.65,40.69a.93.93,0,0,1-.45.11,1,1,0,0,1-.89-.55,13.81,13.81,0,0,0-24.62,0,1,1,0,1,1-1.78-.9,15.8,15.8,0,0,1,28.18,0A1,1,0,0,1,39.65,40.69Z"></path></svg>';
export const successIcon = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><path fill="#279548" d="M26,0A26,26,0,1,0,52,26,26,26,0,0,0,26,0Zm9.6,17.5a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2Zm-19.2,0a2,2,0,1,1-2,2A2,2,0,0,1,16.4,17.5ZM40.09,32.15a15.8,15.8,0,0,1-28.18,0,1,1,0,0,1,1.78-.9,13.81,13.81,0,0,0,24.62,0,1,1,0,1,1,1.78.9Z"></path></svg>';
export const errorText = '<b class="text-bold block text-2xl mb-4">Упс!</b> Что-то пошло не так. Перезагрузите страницу и попробуйте снова. ';
export const successText = '<b class="text-bold block text-2xl mb-4">Спасибо!</b> В скором времени мы свяжемся с Вами!';
export const messageModal = document.getElementById("message-modal");

export const connectForms = (url, props = propsParams) => {
	props = {...propsParams, ...props};

async function submitForm(form){
	const btn = form.querySelector('[type="submit"]');
	const btnText = btn.value || btn.innerText;
	const agree = form.querySelector('[name="' + props.agreeSelector + '"]');
	const phone = form.querySelector('[name="phone"]');
	const name = form.querySelector('[name="name"]');

	let validate;

	if (props.validation && typeof props.validation === 'function') {
		validate = new props.validation(form);
		// console.log(validate);
	}

	if (!validate?.isValid) {
		return;
	}

	// если флажок не установлен - фронт
	// if (!agree.checked) {
	// 	showErrorMes(form, "." + props.agreeSelector, "Чтобы продолжить, установите флажок");
	// 	return;
	// } else {
	// 	setAgreeCookie(90);
	// }

	stateBtn(btn, "Отправляем...", true);

	// Отпрвка цели что форма submit только после всех проверок
	reachGoal("form_submit");

	let formData = new FormData(form);
	let sendMailCookie = props.sendMailCookie;
	if(formData.get('dealer')) {
		sendMailCookie += "_" + formData.get('dealer');
	}
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
		if(props.ct_routeKey != '') {
			const requestData = await createRequest(props.ct_routeKey, phone.value, name.value, props.verbose);
			formData.append("ct_callback", true);
			formData.append("ctw_createRequest", JSON.stringify(requestData));
		} else {
			throw new Error('Empty ct_routeKey');
		}
	} catch (error) {
		if(props.ct_routeKey != '') {
			formData.append("ctw_createRequest", error);
		}
		props.verbose && console.error("Error during request Calltouch callback:", error);
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
			props.verbose && console.log(data);
			stateBtn(btn, btnText);
			if (data.answer == "required") {
				reachGoal("form_required");
				showErrorMes(form, data.field, data.message);
				return;
			} else if (data.answer == "error") {
				reachGoal("form_error");

				// Вызов callback_error при ошибке
				if (props.callback_error && typeof props.callback_error === 'function') {
					props.callback_error(data);
				} else if (messageModal) {
					showMessageModal(messageModal, errorIcon, errorText + "<br>" + data.error);
				}
				return;
			} else {
				if(data.attention != true) {
					reachGoal("form_success", formDataObj);
				}
				setCookie(sendMailCookie, true, {'domain': window.location.hostname,'path':'/','expires':600});
				// Вызов callback при успехе
				if (props.callback && typeof props.callback === 'function') {
					props.callback(data);
				} else if (messageModal) {
					showMessageModal(messageModal, successIcon, successText);
				}
			}
			form.reset();
		})
		.catch((error) => {
			reachGoal("form_error");
			console.error("Ошибка отправки данных формы: " + error);
			deleteCookie(sendMailCookie);
			// Вызов callback_error при ошибке
			if (props.callback_error && typeof props.callback_error === 'function') {
				props.callback_error(data);
			} else if (messageModal) {
				showMessageModal(messageModal, errorIcon, errorText + "<br>" + error);
			}
			stateBtn(btn, btnText);
		});
	return false;
}

async function sendForm(form) {
	let formData = new FormData(form);
	let sendMailCookie = props.sendMailCookie;
	if(formData.get('dealer')) {
		sendMailCookie += "_" + formData.get('dealer');
	}
	if (getCookie(sendMailCookie)) {
		const confirmModal = document.getElementById('confirm-modal');
		if (confirmModal) {
			confirmModal.querySelector('p').innerHTML = props.confirmModalText || '<span style="color: tomato; font-weight: bold">ПЕРЕДАЙ ТЕКСТ В ОБЪЕКТЕ <br><pre style="color: black; font-weight: 400">props = {confirmModalText: <i>"text"</i>}</pre></span>';
			confirmModal.classList.remove("hidden");

			const accept = confirmModal.querySelector('#accept-confirm');
			const acceptClose = confirmModal.querySelector('#accept-close');

			// Проверка на уже добавленный обработчик
			if (!accept.dataset.listenerAdded) {
				accept.dataset.listenerAdded = 'true';
				accept.addEventListener('click', async () => {
					// Закрываем модальное окно
					confirmModal.classList.add("hidden");
					// Удаляем куку
					deleteCookie(sendMailCookie);
					// Повторно отправляем форму
					await submitForm(form);
					return;
				});
			}

			// Проверка на уже добавленный обработчик
			if (!acceptClose.dataset.listenerAdded) {
				acceptClose.dataset.listenerAdded = 'true';
				acceptClose.addEventListener('click', () => {
					// Закрываем модальное окно
					const modals = document.querySelectorAll('.modal-overlay');
					form.reset();
					if (modals.length)  {
						modals.forEach((modal)  =>  modal.classList.add("hidden"));
					}
					confirmModal.classList.add("hidden");
					return;
				});
			}
			return;
		}
	}else{
		// Если куки нет, просто отправляем форму
		await submitForm(form);
		return;
	}
}

// Отправка всех форм
document.querySelectorAll("form:not(.vue-form)").forEach((form) => {
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		await sendForm(form);
	})
});
}