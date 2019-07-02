// ==UserScript==
// @name         VM Addons
// @namespace    bestgalloway
// @version      0.5.41
// @downloadURL  https://github.com/bestgalloway/VM-Addons/raw/master/VMAddons.js
// @updateURL    https://github.com/bestgalloway/VM-Addons/raw/master/VMAddons.js
// @description  Adds utility buttons & messages to the DOM on certain pages to make life easier for users.
// @author       bestgalloway
// @match        *.vmcloudpms.com/*
// @grant        none
// @require https://raw.githubusercontent.com/rafaelw/mutation-summary/master/src/mutation-summary.js
// ==/UserScript==


(function () {
	'use strict';
	// uses mutation-summary.js to create an easy to use MutationObserver to make sure that the page is done loading the first time before executing the callback
	function watch(callback) {
		function checkBusy(summaries) {
			//aria-busy on the body is the best way to check if this is changed (that I've found so far)
			var changes = summaries[0].attributeChanged['aria-busy'];
			if (changes[0].getAttribute('aria-busy') == 'false') {
				observer.disconnect();
				callback();
			}

		}
		//create the observer
		var observer = new MutationSummary({
				callback: checkBusy,
				queries: [{
						element: 'body',
						elementAttributes: 'aria-busy'
					}
				]
			});

	}
	//actually makes our buttons
	function makeButton(btnText, callback, referenceNode) {
		var newButton = document.createElement("button");
		var buttonText = document.createTextNode(btnText);
		var glyphSpan = document.createElement("span");
		newButton.className = "btn btn-primary";
		newButton.setAttribute("type", "button");
		newButton.addEventListener("click", callback);
		glyphSpan.className = "glyphicon glyphicon-list-alt";
		newButton.appendChild(glyphSpan);
		newButton.appendChild(buttonText);

		referenceNode.parentNode.insertBefore(newButton, referenceNode.nextSibling);

	}
	//formats dates to mm/dd/yy
	function mmddyy(d) {
		var mm = (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1);
		var dd = (d.getDate() < 9 ? "0" : "") + d.getDate();
		var yy = String(d.getFullYear()).substr(2);

		return new String().concat(mm, "/", dd, "/", yy);

	}
	// makes a button to automatically fill out the options for what we'll need to export a CSV file to generate reputation emails
	function marketingEmails() {

		function marketingAllCountries() {
			var today = new Date();
			var yesterday = new Date();
			var lastMonth = new Date();

			yesterday.setDate(today.getDate() - 1);
			lastMonth.setDate(today.getDate() - 30);

			today = mmddyy(today);
			yesterday = mmddyy(yesterday);
			lastMonth = mmddyy(lastMonth);

			var event = new Event('change');

			var dates = document.querySelectorAll('[name^="resArrivalDate"]');

			dates[1].value = yesterday;
			dates[1].dispatchEvent(event);
			dates[0].value = lastMonth;
			dates[0].dispatchEvent(event);

			var email = document.querySelector('[name="emailaddr"]');
			email.selectedIndex = 2;
			email.dispatchEvent(event);

			document.querySelector('[data-ng-click="smMarketingGuest.process()"]').click();

		}

		makeButton("Reputation Emails", marketingAllCountries, document.querySelector('[data-ng-click="smMarketingGuest.setDefaults()"]'));

	}
	//adds reservation details to the header at the top. Also indicates if a reservation is prepaid based on known OTA discount codes
	function reservationScreen() {
		var OTA = ["15C", "15D", "15E", "1P", "2P", "44", "45", "D2", "D3", "EC1", "EC3", "EC5", "EC8", "EC9", "ECR", "FI", "HB1", "PKG", "PL", "PLZ", "PN", "SR1", "SR5", "SR8", "SR9", "TH", "thl", "TRHN", "X2", "Z9"];

		var header = document.querySelector('.mid-panel-heading').childNodes[0];
		var lName = document.querySelector('#txtLastName').value;
		var fName = document.querySelector('#txtFirstName').value;

		var gName = lName + ", " + fName;

		var rmTypeOptions = document.querySelector('#cboRoomType').options;
		var rmTypeSelected = document.querySelector('#cboRoomType').selectedIndex
			var rmType = rmTypeOptions[rmTypeSelected].text;

		var rmNoOptions = document.querySelector('#cboRoom').options;
		var rmNoSelected = document.querySelector('#cboRoom').selectedIndex;
		var rmNo = rmNoOptions[rmNoSelected].text;
		function isPrepaid() {
			var prepaidP = document.createElement("p");
			prepaidP.innerHTML = "Prepaid Discount Code";
			prepaidP.setAttribute("style", "color:red; font-weight:bold; margin:0px");

			var weekDaySelect = document.getElementById("cboWeekDayDiscountCode");
			var weekEndSelect = document.getElementById("cboWeekEndDiscountCode");

			var WD = weekDaySelect.options[weekDaySelect.selectedIndex].text;
			var WE = weekDaySelect.options[weekDaySelect.selectedIndex].text;

			var isOTA = OTA.map(d => [WD, WE].includes(d)).includes(true);

			if (isOTA) {
				header.parentElement.appendChild(prepaidP);
				document.querySelector("#btnPaymentMethod").parentNode.parentNode.parentNode.appendChild(prepaidP.cloneNode(true));
			}

		}

		header.textContent = gName + " - " + rmType + " - " + rmNo;
		isPrepaid();
	}
	// changes options to find walk-ins for yesterday (if clicked post-audit)
	function walkIn() {
		var refreshButton = document.querySelector('[data-ng-click="supervisorOperatorReport.refresh()"]');
		function setOptions() {
			var today = new Date();
			var yesterday = new Date();

			yesterday.setDate(today.getDate() - 1);

			// var yesterday = "07/10/18";
			// var today = "07/11/18";
			today = mmddyy(today);
			yesterday = mmddyy(yesterday);

			var event = new Event('change');

			function setDate(f, index) {
				if (index != 3) {
					f.value = yesterday;
				} else {
					f.value = today;
				}
				//f.value = yesterday;
				f.dispatchEvent(event);
				//return f;
			}
			Array.prototype.slice.call(document.getElementsByName("arrivalDate")).map((f, index) => setDate(f, index));

			var resType = document.querySelector('[data-ng-model="supervisorOperatorReport.reportViewer.searchOptions.resType"]');

			resType.selectedIndex = 4;
			resType.dispatchEvent(event);
			refreshButton.click();
		}
		makeButton(" Audit Walk-Ins", setOptions, document.querySelector('h4').parentNode);

	}
	//checks the URL hash passed to it to determine which page we're on, and which function to call
	function checkHash(currentHash) {
		//hacky, but works?
		if (/front-office\/reservations\/id\//gm.test(currentHash)) {
			currentHash = "reservations";
		}
		var fn;
		//abusing object literals to keep from having to write an ugly switch block
		var tests = {
			'#/sales-and-marketing/marketing/guest': function () {
				watch(marketingEmails);
			},
			'#/front-office/supervisor/reports/reservations-by-operator': function () {
				watch(walkIn);
			},
			'reservations': function () {
				watch(reservationScreen);
			}
		};
		//object literal abuse here
		if (tests[currentHash]) {
			fn = tests[currentHash];
		} else {
			fn = function () {
				// console.log("Not in tests");
			};
		}
		return fn();

	}

	//http://felix-kling.de/blog/2011/01/06/how-to-detect-history-pushstate/
	//Intercepts history.pushState so we can call another function before passing the state along as normal. Used for hashchange-like detection.
	(function (history) {
		var pushState = history.pushState;
		history.pushState = function (state) {
			if (typeof history.onpushstate == "function") {
				history.onpushstate({
					state: state
				});
			}
			// checkHash(window.location.hash);
			// console.log(window.location.hash);
			checkHash(new URL(arguments[2]).hash);
			return pushState.apply(history, arguments);
		}
	})(window.history);

	//run hash check on page refresh
	checkHash(window.location.hash);
})();
