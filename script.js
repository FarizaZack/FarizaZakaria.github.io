// Mobile nav toggle
(function () {
	var toggle = document.querySelector('.nav__toggle');
	var links = document.querySelector('.nav__links');
	if (!toggle || !links) return;

	toggle.addEventListener('click', function () {
		var open = links.classList.toggle('open');
		toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
	});

	// Close the menu after tapping a link (mobile)
	links.querySelectorAll('a').forEach(function (a) {
		a.addEventListener('click', function () {
			links.classList.remove('open');
			toggle.setAttribute('aria-expanded', 'false');
		});
	});
})();
