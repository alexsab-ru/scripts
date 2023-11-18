window.dataLayer = window.dataLayer || [];

export function dataLayer(event, t = {}) {
		console.log(event);
		void 0 !== window.dataLayer && window.dataLayer.push({
			event: event,
			...t
		})
	}

export function getFormDataObject(formData, form_id) {
		let obj = {"EventProperties":{}};
		formData.forEach((value, key) => (obj["EventProperties"][key] = value));
		obj['EventCategory'] = 'Lead';
		obj["EventProperties"]['formID'] = form_id;
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
			dataLayer('phone-click');
		});
		item.addEventListener('copy', function(evt) {
			dataLayer('phone-copy');
		});
		item.addEventListener('contextmenu', function(evt) {
			dataLayer('phone-contextmenu');
		});
	}

export function addEmailGoals(item) {
		item.addEventListener('click', function(evt) {
			dataLayer('email-click');
		});
		item.addEventListener('copy', function(evt) {
			dataLayer('email-copy');
		});
		item.addEventListener('contextmenu', function(evt) {
			dataLayer('email-contextmenu');
		});
	}

	document.querySelectorAll('a[href^\="tel:"]').forEach((tel)=>{
		addPhoneGoals(tel);
	});
	document.querySelectorAll('a[href^\="mailto:"]').forEach((tel)=>{
		addEmailGoals(tel);
	});

	var goals = [
		{
			selector: 'form input',
			action: 'click',
			goal: 'form-click',
			title: 'Клик в поле любой формы',
		},
		{
			selector: 'form input',
			action: 'change',
			goal: 'form-change',
			title: 'Изменения полей любой формы',
		},

	];

	goals.forEach(function(value, index, array){
		if(value.goal != null) {
			document.querySelectorAll(value.selector).forEach(function(element) {
				console.log(["Set \"" + value.goal + "\" goal", element]);
				element.addEventListener(value.action, function(){
					dataLayer("reachGoal", {
						eventAction: value.goal,
						title: value.title,
					});
				});
			});
		} else if(value.hit != null) {
			document.querySelectorAll(value.selector).forEach(function(element) {
				console.log(["Set \"" + value.goal + "\" hit", element]);
				element.addEventListener(value.action, function(){
					dataLayer("pageView", {
						eventAction: value.hit,
						title: value.title,
					});
				});
			});
		} else {
			console.warn(["Ошибка в списке целей", value]);
		}
	});
