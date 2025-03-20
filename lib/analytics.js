window.dataLayer = window.dataLayer || [];

export function reachGoal(eventAction, t = {}) {
	t.eventAction = eventAction;
	if(isGTMInstalled()) {
		dl("reachGoal-"+eventAction, {
			...t
		})
	} else {
		if(checkGA4InDataLayer()) {
			gGoal(eventAction, {
				...t
			});
		}
		if(window.ct && window.calltouch_params) {
			window.ct(window.calltouch_params.mod_id, 'goal', eventAction);
		}
		ymGoal(eventAction, {
			...t
		});
	}
}

export function pageView(eventAction, t = {}) {
	t.eventAction = eventAction;
	if(isGTMInstalled()) {
		dl("pageView-"+eventAction, {
			...t
		})
	} else {
		if(checkGA4InDataLayer()) {
			gGoal(eventAction, {
				...t
			});
		}
		ymPage(eventAction, {
			...t
		});
	}
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

export function gGoal(goalName,goalParams){
	try {
		dl(goalName, goalParams)
	} catch (err) {
		console.error(goalName + ' - error send goal to Google Analytics');
	}
}


export function ymGoal(goalName,goalParams) {
	// console.log("ymGoal:", goalName,goalParams);
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

function isGTMInstalled() {
	// console.log("gtm.js:", window.dataLayer.length > 0 && dataLayer[0].event == "gtm.js");
	// console.log("window.isGTMInstalled:", window.isGTMInstalled);
	if (window.dataLayer.length > 0 && dataLayer[0].event == "gtm.js") return true;
	switch(window.isGTMInstalled) {
		case true:
			return true;
			break;
		case false:
			return false;
			break;
		default:
	}

	let scripts = document.querySelectorAll('script');
	for (let script of scripts) {
		if (script.src && script.src.includes('gtm.js')) {
		window.isGTMInstalled = true;
		return true;
		}
	}
	window.isGTMInstalled = false;
	return false;
}

	function checkGA4InDataLayer() {
		// console.log("window.ga4Installed:", window.ga4Installed);
		switch(window.ga4Installed) {
			case true:
				return true;
				break;
			case false:
				return false;
				break;
			default:
		}

		if (typeof window.dataLayer !== 'undefined') {
			// Просмотр событий в dataLayer для поиска конфигурации GA4
			const ga4Config = window.dataLayer.find(item =>
				item && item[0] === 'config' && item[1] && item[1].startsWith('G-')
			);

			if (ga4Config) {
				// console.log('GA4 настройка найдена в dataLayer:', ga4Config[1]);
				window.ga4Installed = true;
				return true;
			}
		}

		const scripts = document.querySelectorAll('script');
		scripts.forEach(script => {
			if (script.src && script.src.includes('gtag.js')) {
				window.ga4Installed = true;
				return true;
			}
		});

		// console.log('GA4 конфигурация не найдена в dataLayer');
		window.ga4Installed = false;
		return false;
	}
