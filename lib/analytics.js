window.dataLayer = window.dataLayer || [];

export function reachGoal(eventAction, t = {}) {
		t.eventAction = eventAction;
		dl("reachGoal-"+eventAction, {
			...t
		})
	}

export function pageView(eventAction, t = {}) {
		t.eventAction = eventAction;
		dl("pageView-"+eventAction, {
			...t
		})
	}

export function dl(event, t = {}) {
		// console.log(event, t);
		void 0 !== window.dataLayer && window.dataLayer.push({
			event: event,
			...t
		})
	}

export function getFormDataObject(formData, form_id) {
		let obj = {"eventProperties":{}};
		formData.forEach((value, key) => (obj["eventProperties"][key] = value));
		obj['eventCategory'] = 'Lead';
		obj["eventProperties"]['formID'] = form_id;
		obj['sourceName'] = 'page';
		return obj;
	}

export function ymGoal(goalName,goalParams) {
		try {
			Ya._metrika.getCounters().forEach((me)=>{
				ym(me.id, "reachGoal", goalName, goalParams||{})
			})
		} catch (err) {
			console.error(goalName + ' - error send goal to Metrika');
		}
	}

export function ymPage(pageName,goalParams) {
		try {
			Ya._metrika.getCounters().forEach((me)=>{
				ym(me.id, "hit", pageName, goalParams||{})
			})
		} catch (err) {
			console.error(goalName + ' - error send page to Metrika');
		}
	}

export function addPhoneGoals(item) {
		item.addEventListener('click', function(evt) {
			reachGoal('phone_click');
		});
		item.addEventListener('copy', function(evt) {
			reachGoal('phone_copy');
		});
		item.addEventListener('contextmenu', function(evt) {
			reachGoal('phone_contextmenu');
		});
	}

export function addEmailGoals(item) {
		item.addEventListener('click', function(evt) {
			reachGoal('email_click');
		});
		item.addEventListener('copy', function(evt) {
			reachGoal('email_copy');
		});
		item.addEventListener('contextmenu', function(evt) {
			reachGoal('email_contextmenu');
		});
	}

	document.querySelectorAll('a[href^\="tel:"]').forEach((tel)=>{
		addPhoneGoals(tel);
	});
	document.querySelectorAll('a[href^\="mailto:"]').forEach((tel)=>{
		addEmailGoals(tel);
	});

	let goals = [
		{
			selector: 'form input',
			action: 'click',
			goal: 'form_click',
			title: 'Клик в поле любой формы',
		},
		{
			selector: 'form input',
			action: 'change',
			goal: 'form_change',
			title: 'Изменения полей любой формы',
		},

	];

	goals.forEach(function(value, index, array){
		if(value.goal != null) {
			document.querySelectorAll(value.selector).forEach(function(element) {
				// console.log("Set \"" + value.goal + "\" goal", element);
				element.addEventListener(value.action, function(){
					reachGoal(value.goal, {
						title: value.title,
					});
				});
			});
		} else if(value.hit != null) {
			document.querySelectorAll(value.selector).forEach(function(element) {
				// console.log("Set \"" + value.goal + "\" hit", element);
				element.addEventListener(value.action, function(){
					pageView(value.hit, {
						title: value.title,
					});
				});
			});
		} else {
			console.warn("Ошибка в списке целей", value);
		}
	});
