import { getCookie, setCookie, deleteCookie, setAgreeCookie } from './cookie';
import {
	appendCalltouchResultToFormData,
	attemptCalltouchCallback,
} from './calltouch';
import { reachGoal, getFormDataObject } from './analytics';
import { resolveFormSuccessAnalytics } from './form/calltouch-analytics';
import { isBlockedUrlParam } from './form/url-params';

export const noValidPhone = (phoneValue) => {
	return ([...new Set(phoneValue.replace(/^(\+7)/g, "").replace(/\D/g, ""))].length === 1);
};

// Кривой %-эскейп в параметре не должен ронять отправку формы
const safeDecodeURIComponent = (value) => {
	try {
		return decodeURIComponent(value);
	} catch (e) {
		return value;
	}
};

const appendUrlParams = (formData, query, blockedExtra) => {
	query.split("&").forEach(function (pair) {
		let param = pair.split("=");
		if(!param[0]){
			return;
		}
		const key = safeDecodeURIComponent(param[0]);
		if(isBlockedUrlParam(key, blockedExtra)){
			return;
		}
		const value = safeDecodeURIComponent(param[1] || '');
		if(formData.get(key)){
			formData.set(key, value);
		} else {
			formData.append(key, value);
		}
	});
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

const normalizeInvalidFieldNames = (fields = []) => [...new Set(
	fields
		.map((field) => String(field || '').replace(/^[.#]+/, '').trim())
		.filter((field) => /^[A-Za-zА-Яа-яЁё0-9_-]{1,80}$/.test(field))
)].slice(0, 20);

const getValidationGoalPayload = (form, validationSource, invalidFields = []) => {
	const fields = normalizeInvalidFieldNames(invalidFields);
	return {
		eventProperties: {
			validationSource,
			formID: String(form.id || '').slice(0, 100),
			invalidFields: fields.join(','),
			invalidCount: fields.length,
		},
	};
};

const reachFormRequiredGoal = (form, validationSource, invalidFields) => {
	reachGoal(
		'form_required',
		getValidationGoalPayload(form, validationSource, invalidFields)
	);
};

const reachFormErrorGoal = (form, errorSource, errorStage, httpStatus) => {
	const eventProperties = {
		errorSource,
		errorStage,
		formID: String(form.id || '').slice(0, 100),
	};
	if (Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599) {
		eventProperties.httpStatus = httpStatus;
	}
	reachGoal('form_error', { eventProperties });
};

// Показ сообщения об ошибке
export const showErrorMes = (form, el, text) => {
	let field;
	// el может прийти из ответа сервера (data.field) — невалидный селектор бросает SyntaxError
	try {
		field = form.querySelector(el);
	} catch (e) {
		console.warn('showErrorMes: invalid selector', { selector: el, form });
		return;
	}
	if (!field) {
		console.warn('showErrorMes: element not found', { selector: el, form });
		return;
	}
	field.innerText = text;
	field.classList.remove("hidden");
};

// Показ модального окна с сообщением об успехе/ошибке.
// message — только доверенный HTML (константы errorText/successText);
// detail — недоверенная строка (ответ сервера/ошибка), вставляется как текст.
export const showMessageModal = (messageModal, icon, message, detail) => {
	document.querySelectorAll(".modal-overlay").forEach((el) => {
		el.classList.add("hidden");
	});
	if(messageModal){
		messageModal.querySelector("#icon").innerHTML = icon;
		const text = messageModal.querySelector("p");
		text.innerHTML = message;
		if (detail !== undefined && detail !== null && detail !== '') {
			text.appendChild(document.createElement('br'));
			text.appendChild(document.createTextNode(String(detail)));
		}
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
	blockedUrlParams: [],
}

export const errorIcon = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><path fill="#ed1c24" d="M26,0A26,26,0,1,0,52,26,26,26,0,0,0,26,0Zm9.6,17.5a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2Zm-19.2,0a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2ZM39.65,40.69a.93.93,0,0,1-.45.11,1,1,0,0,1-.89-.55,13.81,13.81,0,0,0-24.62,0,1,1,0,1,1-1.78-.9,15.8,15.8,0,0,1,28.18,0A1,1,0,0,1,39.65,40.69Z"></path></svg>';
export const successIcon = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><path fill="#279548" d="M26,0A26,26,0,1,0,52,26,26,26,0,0,0,26,0Zm9.6,17.5a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2Zm-19.2,0a2,2,0,1,1-2,2A2,2,0,0,1,16.4,17.5ZM40.09,32.15a15.8,15.8,0,0,1-28.18,0,1,1,0,0,1,1.78-.9,13.81,13.81,0,0,0,24.62,0,1,1,0,1,1,1.78.9Z"></path></svg>';
export const errorText = '<b class="text-bold block text-2xl mb-4">Упс!</b> Что-то пошло не так. Перезагрузите страницу и попробуйте снова. ';
export const successText = '<b class="text-bold block text-2xl mb-4">Спасибо!</b> В скором времени мы свяжемся с Вами!';
export const messageModal = document.getElementById("message-modal");

export const connectForms = (url, props = propsParams) => {
	props = {...propsParams, ...props};

	props.verbose && console.log("url: ", url);
	props.verbose && console.log("props: ", props);

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
				validate = {
					isValid: Boolean(result.isValid),
					invalidFields: result.invalidFields || instance?.invalidFields || [],
				};
			} else if (instance && typeof instance.isValid !== 'undefined') {
				validate = {
					isValid: Boolean(instance.isValid),
					invalidFields: instance.invalidFields || [],
				};
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
			reachFormRequiredGoal(form, 'client', ['phone']);
			return;
		}
		
		if(dealer && dealer.hasAttribute('required')){
			if(!dealer.value){
				showErrorMes(form, '.dealer', 'Выберите дилерский центр');
				reachFormRequiredGoal(form, 'client', ['dealer']);
				return;
			}
		}

		// agree обязателен: если не найден или не отмечен — показываем ошибку
		if (!agree || !agree.checked) {
			showErrorMes(form, "." + props.agreeSelector, "Чтобы продолжить, установите флажок");
			reachFormRequiredGoal(form, 'client', [props.agreeSelector]);
			return;
		}

		// Иначе считаем форму валидной
		validate = { isValid: true };
	}

	// Если форма невалидна (isValid === false), прекращаем отправку
	if (!validate.isValid) {
		reachFormRequiredGoal(
			form,
			'client',
			validate.invalidFields?.length ? validate.invalidFields : ['form']
		);
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
		try {
			let source = new URL(getCookie('__gtm_campaign_url'));
			appendUrlParams(formData, source.search.slice(1), props.blockedUrlParams);
		} catch (e) {
			console.warn('Invalid __gtm_campaign_url cookie', e);
		}
	}
	formData.append(
		"page_url",
		window.location.origin + window.location.pathname
	);

	if(typeof window.re != 'undefined') {
		formData.append("re", window.re);
	}

	appendUrlParams(formData, window.location.search.slice(1), props.blockedUrlParams);

	// Считаем значения один раз, чтобы одинаково использовать их в try/catch и логах.
	const dealerRouteKey = dealer && dealer.dataset ? (dealer.dataset.ctRouteKey || '').trim() : '';
	const dealerModId = dealer && dealer.dataset ? (dealer.dataset.ctModId || '').trim() : '';
	const dealerSiteId = dealer && dealer.dataset ? (dealer.dataset.ctSiteId || '').trim() : '';
	const calltouchRouteKey = dealerRouteKey || props.ct_routeKey;
	const calltouchResult = await attemptCalltouchCallback({
		routeKey: calltouchRouteKey,
		phone: phone && phone.value ? phone.value : '',
		name: name && name.value ? name.value : '',
		modId: dealerModId,
		siteId: dealerSiteId,
		verbose,
	});
	appendCalltouchResultToFormData(formData, calltouchResult);

	verbose && console.log('Calltouch callback result:', calltouchResult);

	// Analytics payload нужен и после успешного callback: resolver заменит только
	// eventCategory, сохранив поля формы, UTM, sourceName и выбранный проект.
	const formDataObj = getFormDataObject(formData, form.id);
	if (calltouchResult.siteId) {
		formDataObj.siteId = calltouchResult.siteId;
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

	const handleSubmissionError = (error) => {
		console.error("Ошибка отправки данных формы: " + error);
		deleteCookie(sendMailCookie);
		if (props.callback_error && typeof props.callback_error === 'function') {
			props.callback_error(error);
		} else if (messageModal) {
			showMessageModal(messageModal, errorIcon, errorText, error);
		}
		stateBtn(btn, btnText);
	};

	let response;
	try {
		response = await fetch(url, requestOptions);
	} catch (error) {
		reachFormErrorGoal(form, 'network', 'lead_request');
		handleSubmissionError(error);
		return false;
	}

	let responseText;
	try {
		responseText = await response.text();
	} catch (error) {
		reachFormErrorGoal(form, 'network', 'response_read', response.status);
		handleSubmissionError(error);
		return false;
	}

	let data;
	try {
		data = JSON.parse(responseText);
	} catch (error) {
		reachFormErrorGoal(form, 'server', 'response_parse', response.status);
		handleSubmissionError(new Error("Ошибка обработки данных"));
		return false;
	}

	verbose && console.log(data);
	stateBtn(btn, btnText);
	if (data.answer == "required") {
		reachFormRequiredGoal(form, 'server', [data.field]);
		showErrorMes(form, data.field, data.message);
		return false;
	} else if (data.answer == "error") {
		reachFormErrorGoal(form, 'server', 'lead_response', response.status);

		if (props.callback_error && typeof props.callback_error === 'function') {
			props.callback_error(data);
		} else if (messageModal) {
			showMessageModal(messageModal, errorIcon, errorText, data.error);
		}
		return false;
	}

	try {
		const normalizedPhone = String(formData.get("phone") || (phone && phone.value ? phone.value : "")).replace(/\D/g, "");
		const attentionPhone = String(props.successOnAttentionPhone || "").replace(/\D/g, "");
		// Сервер может вернуть attention:true, если заявка похожа на спам.
		// Тогда form_success не отправляем — фиксируем отдельной целью form_attention.
		// Исключение: тестовый телефон successOnAttentionPhone — для проверки воронки на стенде.
		const isAttentionFlag = data.attention == true;
		const isAttentionTestPhone = attentionPhone && normalizedPhone === attentionPhone;
		const analyticsDecision = resolveFormSuccessAnalytics({
			serverCallbackStatus: data.calltouch_callback
				? String(data.calltouch_callback.status || '')
				: '',
			clientCallbackStatus: calltouchResult.status,
			attention: isAttentionFlag,
			attentionTestPhone: Boolean(isAttentionTestPhone),
			leadPayload: formDataObj,
		});
		if (analyticsDecision.payload === undefined) {
			reachGoal(analyticsDecision.goal);
		} else {
			reachGoal(analyticsDecision.goal, analyticsDecision.payload);
		}
		setCookie(sendMailCookie, true, {'domain': window.location.hostname,'path':'/','expires':600});
		// Вызов callback при успехе
		if (props.callback && typeof props.callback === 'function') {
			props.callback(data);
		} else if (messageModal) {
			showMessageModal(messageModal, successIcon, successText);
		}
		form.reset();
		if (hasFileUpload) {
			resetDropzones(props);
		}
	} catch (error) {
		reachFormErrorGoal(form, 'client', 'success_handler');
		handleSubmissionError(error);
	}
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
