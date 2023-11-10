window.WebsiteAnalytics = (function() {

	window.dataLayer = window.dataLayer || [];

	function dataLayer(event, t = {}) {
		void 0 !== window.dataLayer && window.dataLayer.push({
			event: event,
			...t
		})
	}

	function getFormDataObject(formData, form_id) {
		let obj = {"EventProperties":{}};
		formData.forEach((value, key) => (obj["EventProperties"][key] = value));
		obj['EventCategory'] = 'Lead';
		obj["EventProperties"]['formID'] = form_id;
		obj['sourceName'] = 'page';
		return obj;
	}

	function ymGoal(goalName,goalParams) {
		try {
			Ya._metrika.getCounters().forEach((me)=>{
				ym(me.id, "reachGoal", goalName, goalParams||{})
			})
		} catch (err) {
			console.error(goalName + ' - error send goal to Metrika');
		}
	}

	function ymPage(pageName,goalParams) {
		try {
			Ya._metrika.getCounters().forEach((me)=>{
				ym(me.id, "hit", pageName, goalParams||{})
			})
		} catch (err) {
			console.error(goalName + ' - error send page to Metrika');
		}
	}

	function addPhoneGoals(item) {
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

	function addEmailGoals(item) {
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

	var goals = [
		{
			selector: 'a[href^\="#common-modal"]',
			action: 'click',
			goal: 'form-open',
			title: 'Открыли любую форму',
		},
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
				// console.log("Set \"" + value.goal + "\" goal");
				element.addEventListener(value.action, function(){
					dataLayer(value.goal);
				});
			});
		} else if(value.hit != null) {
			document.querySelectorAll(value.selector).forEach(function(element) {
				// console.log("Set \"" + value.goal + "\" hit");
				element.addEventListener(value.action, function(){
					// ymPage(value.goal);
					dataLayer.push({
						event:"pageView",
						eventAction: value.hit,
						title: value.title,
					});
				});
			});
		} else {
			console.warn(["Ошибка в списке целей", value]);
		}
	});

	document.querySelectorAll('a[href^\="tel:"]').forEach((tel)=>{
		addPhoneGoals(tel);
	});
	document.querySelectorAll('a[href^\="mailto:"]').forEach((tel)=>{
		addEmailGoals(tel);
	});

	// возвращаем объект с публичной функцией
	return {
		ymGoal: ymGoal,
		ymPage: ymPage,
		getFormDataObject: getFormDataObject,
		dataLayer: dataLayer,
	};

})();
