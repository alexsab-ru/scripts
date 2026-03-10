import { getCookie, setCookie, deleteCookie, setAgreeCookie } from './cookie';
import { createRequest } from './calltouch';
import { reachGoal, getFormDataObject } from './analytics';

export const noValidPhone = (phoneValue) => {
	return ([...new Set(phoneValue.replace(/^(\+7)/g, "").replace(/\D/g, ""))].length === 1);
};

export const maskphone = (e) => {
	const input = e.currentTarget;
	let num = input.value.replace(/^(\+7|8|7)/g, "").replace(/\D/g, "").split(/(?=.)/);
	const i = num.length;

	if (input.value !== "" && input.value !== "+") {
		if (0 <= i) num.unshift("+7");
		if (1 <= i) num.splice(1, 0, " ");
		if (4 <= i) num.splice(5, 0, " ");
		if (7 <= i) num.splice(9, 0, "-");
		if (9 <= i) num.splice(12, 0, "-");
		input.value = num.join("");
	}
};


export const phoneChecker = (phone, options = {}) => {
	// Опция silent:
	// - true  => функция работает в "тихом" режиме (НЕ показывает сообщения), возвращает только true|false
	// - false => ведёт себя как раньше: показывает разные сообщения об ошибках
	const { silent = false } = options;

	let form = phone.closest("form");

	// Пустое значение
	if (!phone.value.length) {
		if (!silent && form) {
			showErrorMes(form, ".phone", "Телефон является обязательным полем");
		}
		return false;
	}

	// Формат и анти-флуд (одинаковые цифры)
	const phoneRe = new RegExp(/^\+7 [0-9]{3} [0-9]{3}-[0-9]{2}-[0-9]{2}$/);
	if (!phoneRe.test(phone.value) || noValidPhone(phone.value)) {
		if (!silent && form) {
			showErrorMes(form, ".phone", "Введен некорректный номер телефона");
		}
		return false;
	}

	// Валидно — в шумном режиме прячем текст ошибки
	if (!silent && form) {
		showErrorMes(form, ".phone", "");
	}
	return true;
};

// TEXTAREA
const minLengthTextareaField = 10; // минимальное кол-во символов
// проверка на минимальное кол-во символов и скрытие ошибки
const checkTextareaLength = (textarea, minLength) => {
	if (textarea.value.length >= minLength) {
		textarea.nextSibling.nextElementSibling.classList.add("hidden");
	}
};

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

const hasFileUploadField = (form, selector) => {
	if (!selector) {
		return false;
	}
	return !!form.querySelector(selector);
};

const appendDropzoneFiles = (formData, { filesToUploadKey, fileFieldName }) => {
	if (!filesToUploadKey || !fileFieldName) {
		return;
	}

	const files = window[filesToUploadKey];
	if (!Array.isArray(files)) {
		return;
	}

	files.forEach((file) => {
		formData.append(fileFieldName, file);
	});
};

const resetDropzones = ({ dropzonesKey, filesToUploadKey }) => {
	if (!dropzonesKey || !filesToUploadKey) {
		return;
	}

	const dropzones = window[dropzonesKey];
	if (Array.isArray(dropzones)) {
		dropzones.forEach((dropzone) => {
			if (dropzone && typeof dropzone.removeAllFiles === 'function') {
				dropzone.removeAllFiles();
			}
		});
	}

	if (Array.isArray(window[filesToUploadKey])) {
		window[filesToUploadKey] = [];
	}
};

// Показ сообщения об ошибке
export const showErrorMes = (form, el, text) => {
	let field = form.querySelector(el);
	if (!field) {
		console.warn('showErrorMes: element not found', { selector: el, form });
		return;
	}
	field.innerText = text;
	field.classList.remove("hidden");
};

// Показ модального окна с сообщением об успехе/ошибке
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
	fileUploadSelector: ".file-upload",
	fileFieldName: "file[]",
	filesToUploadKey: "filesToUpload",
	dropzonesKey: "dropzones",
	successOnAttentionPhone: "79000000000",
}

export const errorIcon = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><path fill="#ed1c24" d="M26,0A26,26,0,1,0,52,26,26,26,0,0,0,26,0Zm9.6,17.5a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2Zm-19.2,0a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2ZM39.65,40.69a.93.93,0,0,1-.45.11,1,1,0,0,1-.89-.55,13.81,13.81,0,0,0-24.62,0,1,1,0,1,1-1.78-.9,15.8,15.8,0,0,1,28.18,0A1,1,0,0,1,39.65,40.69Z"></path></svg>';
export const successIcon = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><path fill="#279548" d="M26,0A26,26,0,1,0,52,26,26,26,0,0,0,26,0Zm9.6,17.5a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2Zm-19.2,0a2,2,0,1,1-2,2A2,2,0,0,1,16.4,17.5ZM40.09,32.15a15.8,15.8,0,0,1-28.18,0,1,1,0,0,1,1.78-.9,13.81,13.81,0,0,0,24.62,0,1,1,0,1,1,1.78.9Z"></path></svg>';
export const errorText = '<b class="text-bold block text-2xl mb-4">Упс!</b> Что-то пошло не так. Перезагрузите страницу и попробуйте снова. ';
export const successText = '<b class="text-bold block text-2xl mb-4">Спасибо!</b> В скором времени мы свяжемся с Вами!';
export const messageModal = document.getElementById("message-modal");

export const connectForms = (url, props = propsParams) => {
	props = {...propsParams, ...props};

	console.log("url: ", url);
	console.log("props: ", props);

	document.querySelectorAll("input[name=phone]").forEach(function (element) {
		// element.addEventListener("focus", maskphone);
		element.addEventListener("input", maskphone);
		element.addEventListener("change", () => phoneChecker(element));
	});

	// AGREE CHECKBOX
	// Проверка на состояние чекбокса, показ/скрытие ошибки
	document.querySelectorAll("input[name=" + props.agreeSelector + "]").forEach(function (element) {
		let errorMes = element.parentElement.querySelector("." + props.agreeSelector);
		element.addEventListener("change", (e) => {
			if (!e.target.checked) {
				errorMes.classList.remove("hidden");
			} else {
				errorMes.classList.add("hidden");
			}
		});
	});

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


const submitForm = async (form) => {
	const btn = form.querySelector('[type="submit"]');
	const btnText = btn.value || btn.innerText;
	const agree = form.querySelector('[name="' + props.agreeSelector + '"]');
	const phone = form.querySelector('[name="phone"]');
	const name = form.querySelector('[name="name"]');
	const dealer = form.querySelector('[name="dealer"]');
	const hasFileUpload = hasFileUploadField(form, props.fileUploadSelector);
	const ftaCookie = Boolean(getCookie('fta'));
	const verbose = Boolean(props.verbose || ftaCookie);

	let validate;

	// Валидируем форму. Поддерживаем 2 кейса:
	// 1) Пользователь передал класс (конструктор), который имеет метод validate() или run() или поле isValid
	// 2) Пользователь передал функцию, возвращающую boolean или объект с isValid
	if (props.validation && typeof props.validation === 'function') {
		try {
			let instance;
			let result;

			// Пытаемся создать экземпляр (если передан класс). Если не конструктор — вызовем как функцию ниже
			try {
				instance = new props.validation(form);
			} catch (e) {
				// Если это не конструктор (например, стрелочная функция), пробуем вызвать как обычную функцию
				result = props.validation(form);
			}

			// Если есть экземпляр, пробуем стандартные методы
			if (instance) {
				if (typeof instance.validate === 'function') {
					result = await instance.validate();
				} else if (typeof instance.run === 'function') {
					result = await instance.run();
				} else if (typeof instance.isValid !== 'undefined') {
					result = { isValid: instance.isValid };
				}
			}

			// Нормализуем результат к виду { isValid: boolean }
			if (typeof result === 'boolean') {
				validate = { isValid: result };
			} else if (result && typeof result === 'object' && 'isValid' in result) {
				validate = { isValid: Boolean(result.isValid) };
			} else if (instance && typeof instance.isValid !== 'undefined') {
				validate = { isValid: Boolean(instance.isValid) };
			} else {
				// Если валидатор ничего не вернул, считаем, что он сам показал ошибки и блокируем отправку
				validate = { isValid: false };
			}
		} catch (err) {
			// Если кастомный валидатор упал — показываем в консоли и блокируем отправку, чтобы не уйти с невалидной формой
			console.error('Validation error:', err);
			validate = { isValid: false };
		}
	} else {
		// Базовые проверки, если кастомный валидатор не передан
		if (!phoneChecker(phone)) {
			return;
		}
		
		if(dealer && dealer.hasAttribute('required')){
			if(!dealer.value){
				showErrorMes(form, '.dealer', 'Выберите дилерский центр');
				return;
			}
		}

		// agree обязателен: если не найден или не отмечен — показываем ошибку
		if (!agree || !agree.checked) {
			showErrorMes(form, "." + props.agreeSelector, "Чтобы продолжить, установите флажок");
			return;
		}

		// Иначе считаем форму валидной
		validate = { isValid: true };
	}

	// Если форма невалидна (isValid === false), прекращаем отправку
	if (!validate.isValid) {
		return;
	}

	// если флажок установлен - устанавливаем куки (проверяем на наличие agree)
	if (agree && agree.checked) {
		setAgreeCookie(90);
	}

	stateBtn(btn, "Отправляем...", true);

	// Отпрвка цели что форма submit только после всех проверок
	reachGoal("form_submit");

	let formData = new FormData(form);
	if (hasFileUpload) {
		appendDropzoneFiles(formData, props);
	}
	let sendMailCookie = props.sendMailCookie;
	if(formData.get('dealer')) {
		sendMailCookie += "_" + formData.get('dealer');
	}
	if(ftaCookie) {
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
			if(!param[0]){
				return;
			}
			if(formData.get(param[0])){
				formData.set(param[0], decodeURIComponent(param[1]));
			} else {
				formData.append(param[0], decodeURIComponent(param[1]));
			}
		});

	let formDataObj = {};
	// Считаем значения один раз, чтобы одинаково использовать их в try/catch и логах.
	const dealerRouteKey = dealer && dealer.dataset ? (dealer.dataset.ctRouteKey || '').trim() : '';
	const dealerModId = dealer && dealer.dataset ? (dealer.dataset.ctModId || '').trim() : '';
	const dealerSiteId = dealer && dealer.dataset ? (dealer.dataset.ctSiteId || '').trim() : '';
	const calltouchRouteKey = dealerRouteKey || props.ct_routeKey;
	const scopedCtwName = dealerModId ? `ctw_${dealerModId}` : '';
	const hasScopedCtw = scopedCtwName ? typeof window[scopedCtwName] !== 'undefined' : false;
	const hasGlobalCtw = typeof window.ctw !== 'undefined';

	try {
		// Для multi-project берём routeKey/mod_id у выбранного дилера (data-атрибуты select).
		// Если дилерские значения отсутствуют, используем старый глобальный props.ct_routeKey.
		verbose && console.log('Calltouch submit debug:', {
			formId: form.id || '',
			phone: phone && phone.value ? phone.value : '',
			name: name && name.value ? name.value : '',
			dealerValue: dealer && dealer.value ? dealer.value : '',
			dealerRouteKey,
			dealerModId,
			dealerSiteId,
			fallbackRouteKey: props.ct_routeKey,
			calltouchRouteKey,
			scopedCtwName,
			hasScopedCtw,
			hasGlobalCtw
		});

		// Отправка заявки на обратный вызов в CallTouch.
		if(calltouchRouteKey != '') {
			const requestData = await createRequest(calltouchRouteKey, phone.value, name.value, verbose, dealerModId);
			formData.append("ct_callback", true);
			formData.append("ctw_createRequest", JSON.stringify(requestData));
			if (dealerModId !== '') {
				// Храним mod_id в payload для отладки и серверных логов.
				formData.append("ct_mod_id", dealerModId);
			}
		} else {
			throw new Error('Empty ct_routeKey');
		}
	} catch (error) {
		if(calltouchRouteKey != '') {
			formData.append("ctw_createRequest", error);
		}
		const normalizedError = error instanceof Error ? {
			name: error.name,
			message: error.message,
			stack: error.stack
		} : error;
		console.error("Error during request Calltouch callback:", normalizedError, {
			formId: form.id || '',
			dealerRouteKey,
			dealerModId,
			dealerSiteId,
			fallbackRouteKey: props.ct_routeKey,
			calltouchRouteKey,
			scopedCtwName,
			hasScopedCtw,
			hasGlobalCtw
		});
		formDataObj = getFormDataObject(formData, form.id);
		// Если известен конкретный siteId дилера, прокидываем его,
		// чтобы reachGoal → sendToCallTouch отправил лид в нужный проект.
		if (dealerSiteId) {
			formDataObj.siteId = dealerSiteId;
		}
	}

	const requestOptions = hasFileUpload
		? {
			method: "POST",
			body: formData,
		}
		: {
			method: "POST",
			mode: "cors",
			cache: "no-cache",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams([...formData]),
		};

	await fetch(url, requestOptions)
		.then(async (res) => {
			const text = await res.text();
			try {
				return JSON.parse(text);
			} catch (error) {
				throw new Error("Ошибка обработки данных");
			}
		})
		.then((data) => {
			verbose && console.log(data);
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
				const normalizedPhone = String(formData.get("phone") || (phone && phone.value ? phone.value : "")).replace(/\D/g, "");
				const attentionPhone = String(props.successOnAttentionPhone || "").replace(/\D/g, "");
				if(data.attention != true || (attentionPhone && normalizedPhone === attentionPhone)) {
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
			if (hasFileUpload) {
				resetDropzones(props);
			}
		})
		.catch((error) => {
			reachGoal("form_error");
			console.error("Ошибка отправки данных формы: " + error);
			deleteCookie(sendMailCookie);
			// Вызов callback_error при ошибке
			if (props.callback_error && typeof props.callback_error === 'function') {
				props.callback_error(error);
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
