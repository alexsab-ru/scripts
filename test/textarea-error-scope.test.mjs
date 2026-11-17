import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Exercise the existing private helper without importing browser integrations
// or changing the public package exports.
const source = await readFile(new URL('../lib/form.js', import.meta.url), 'utf8');
const block = source.slice(source.indexOf('// TEXTAREA'), source.indexOf('// BUTTON'));
const errorBlock = source.slice(source.indexOf('export const showErrorMes'), source.indexOf('// Показ модального окна'));
const moduleSource = `${block}\n${errorBlock}\nexport { checkTextareaLength, minLengthTextareaField };`;
const { checkTextareaLength, minLengthTextareaField, showErrorMes } = await import(
	`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

function element(className) {
	const classes = new Set(className.split(' '));
	const attributes = new Map();
	return {
		getAttribute(name) { return attributes.get(name) ?? null; },
		setAttribute(name, value) { attributes.set(name, String(value)); },
		removeAttribute(name) { attributes.delete(name); },
		classList: {
			add(value) { classes.add(value); },
			remove(value) { classes.delete(value); },
			contains(value) { return classes.has(value); },
		},
	};
}

function field({ whitespace = true, helper = false, error = true } = {}) {
	const errorNode = error ? element('error-message comment') : null;
	const helperNode = helper ? element('field-hint') : null;
	const siblings = [helperNode, errorNode].filter(Boolean);
	const textarea = {
		...element(''),
		value: '1234567890',
		parentElement: {
			querySelector(selector) {
				assert.equal(selector, '.error-message');
				return siblings.find(node => node.classList.contains('error-message')) || null;
			},
		},
		nextSibling: whitespace ? { nextElementSibling: siblings[0] || null } : siblings[0] || null,
	};
	return { textarea, errorNode, helperNode };
}

test('textarea error lookup works with both whitespace and minified sibling layout', () => {
	for (const whitespace of [true, false]) {
		const { textarea, errorNode } = field({ whitespace });
		checkTextareaLength(textarea, minLengthTextareaField);
		assert.equal(errorNode.classList.contains('hidden'), true);
	}
});

test('a hint between textarea and error stays visible while the error hides', () => {
	const { textarea, errorNode, helperNode } = field({ helper: true });
	checkTextareaLength(textarea, minLengthTextareaField);
	assert.equal(errorNode.classList.contains('hidden'), true);
	assert.equal(helperNode.classList.contains('hidden'), false);
});

test('optional textarea without an error or a detached textarea does not throw', () => {
	const { textarea } = field({ error: false });
	assert.doesNotThrow(() => checkTextareaLength(textarea, minLengthTextareaField));
	textarea.parentElement = null;
	assert.doesNotThrow(() => checkTextareaLength(textarea, minLengthTextareaField));
});

test('the ten-character threshold stays unchanged', () => {
	assert.equal(minLengthTextareaField, 10);
	const { textarea, errorNode } = field();
	textarea.value = '123456789';
	textarea.setAttribute('aria-invalid', 'true');
	checkTextareaLength(textarea, minLengthTextareaField);
	assert.equal(errorNode.classList.contains('hidden'), false);
	assert.equal(textarea.getAttribute('aria-invalid'), 'true');
	textarea.value += '0';
	checkTextareaLength(textarea, minLengthTextareaField);
	assert.equal(errorNode.classList.contains('hidden'), true);
	assert.equal(textarea.getAttribute('aria-invalid'), null);
});

test('equal field names in two forms keep independent error nodes', () => {
	const first = field();
	const second = field();
	checkTextareaLength(first.textarea, minLengthTextareaField);
	assert.equal(first.errorNode.classList.contains('hidden'), true);
	assert.equal(second.errorNode.classList.contains('hidden'), false);
});

test('server errors update only a control linked to this error in the current form', () => {
	const errorNode = element('error-message phone hidden');
	// The ID deliberately is not safe to interpolate into a CSS selector.
	errorNode.id = 'phone-error"]';
	const linked = element('');
	linked.setAttribute('aria-errormessage', errorNode.id);
	const unrelated = element('');
	unrelated.setAttribute('aria-errormessage', 'different-error');
	const secondFormControl = element('');
	secondFormControl.setAttribute('aria-errormessage', errorNode.id);
	const form = {
		elements: [linked, unrelated],
		querySelector(selector) { assert.equal(selector, '.phone'); return errorNode; },
	};
	showErrorMes(form, '.phone', 'Укажите телефон');
	assert.equal(errorNode.innerText, 'Укажите телефон');
	assert.equal(errorNode.classList.contains('hidden'), false);
	assert.equal(linked.getAttribute('aria-invalid'), 'true');
	assert.equal(unrelated.getAttribute('aria-invalid'), null);
	assert.equal(secondFormControl.getAttribute('aria-invalid'), null);
});

test('clearing the phone message also clears its linked invalid state', () => {
	const errorNode = element('error-message phone');
	errorNode.id = 'phone-error';
	const linked = element('');
	linked.setAttribute('aria-errormessage', errorNode.id);
	linked.setAttribute('aria-invalid', 'true');
	showErrorMes({ elements: [linked], querySelector: () => errorNode }, '.phone', '');
	assert.equal(linked.getAttribute('aria-invalid'), null);
	assert.equal(errorNode.innerText, '');
});

test('legacy errors without an ID do not alter unrelated controls', () => {
	const errorNode = element('error-message phone hidden');
	const control = element('');
	control.setAttribute('aria-invalid', 'spelling');
	showErrorMes({ elements: [control], querySelector: () => errorNode }, '.phone', 'Проверьте поле');
	assert.equal(errorNode.classList.contains('hidden'), false);
	assert.equal(control.getAttribute('aria-invalid'), 'spelling');
});
