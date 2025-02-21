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
		let eventProperties = {};
		formData.forEach((value, key) => (eventProperties[key] = value));
		eventProperties['formID'] = form_id;
		return {
			"eventProperties": eventProperties,
			"eventCategory": "Lead",
			"sourceName": "page",
		};
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
			console.error(pageName + ' - error send page to Metrika');
		}
	}

export function addClickCopyContextmenuGoals(item, prefix) {
		item.addEventListener('click', function(evt) {
			reachGoal(prefix + '_click');
		});
		item.addEventListener('copy', function(evt) {
			reachGoal(prefix + '_copy');
		});
		item.addEventListener('contextmenu', function(evt) {
			reachGoal(prefix + '_contextmenu');
		});
	}

	document.querySelectorAll('a[href^\="tel:"]').forEach((tel)=>{
		addClickCopyContextmenuGoals(tel, "phone");
	});
	document.querySelectorAll('a[href^\="mailto:"]').forEach((tel)=>{
		addClickCopyContextmenuGoals(tel, "email");
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
