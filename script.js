/* The Ledger — motion system
   Vanilla JS only: hamburger nav, hero entrance, IntersectionObserver
   reveals with stagger, the live ledger grid, and the sticky cover
   offset for the dark finale. Everything respects reduced motion. */

(function () {
	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* ---------- mobile nav ---------- */
	var toggle = document.querySelector('.nav__toggle');
	var links = document.querySelector('.nav__links');
	if (toggle && links) {
		toggle.addEventListener('click', function () {
			var open = links.classList.toggle('open');
			toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		});
		links.addEventListener('click', function (e) {
			if (e.target.tagName === 'A') {
				links.classList.remove('open');
				toggle.setAttribute('aria-expanded', 'false');
			}
		});
	}

	/* ---------- hero entrance ---------- */
	requestAnimationFrame(function () {
		requestAnimationFrame(function () {
			document.body.classList.add('is-loaded');
		});
	});

	/* ---------- scroll reveals, staggered per section ---------- */
	var revealed = document.querySelectorAll('.reveal, .section__head, .entry');
	if ('IntersectionObserver' in window && !reduced) {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (!en.isIntersecting) return;
				en.target.classList.add('is-in');
				io.unobserve(en.target);
			});
		}, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

		// stagger siblings that enter together: delay = index within parent group
		var groups = {};
		revealed.forEach(function (el) {
			var p = el.parentElement;
			var key = p ? (p.dataset.g || (p.dataset.g = Math.random().toString(36).slice(2))) : 'root';
			groups[key] = (groups[key] || 0);
			if (el.classList.contains('reveal')) {
				el.style.setProperty('--d', Math.min(groups[key] * 0.09, 0.45) + 's');
				groups[key]++;
			}
			io.observe(el);
		});
	} else {
		revealed.forEach(function (el) { el.classList.add('is-in'); });
	}

	/* ---------- the ledger grid ---------- */
	var grid = document.getElementById('ledgerGrid');
	var flag = document.getElementById('gridFlag');
	if (grid) {
		var COLS = 7, ROWS = 4, N = COLS * ROWS;
		var cells = [];
		for (var i = 0; i < N; i++) {
			var s = document.createElement('span');
			grid.appendChild(s);
			cells.push(s);
		}

		if (!reduced) {
			// a tick sweeps through the cells like checks running
			var head = 0;
			setInterval(function () {
				cells.forEach(function (c, i) {
					c.classList.toggle('tick', ((i - head + N) % N) < 4 && !c.classList.contains('exc'));
				});
				head = (head + 1) % N;
			}, 170);

			// every few seconds, one cell flips to an exception, then resolves
			setInterval(function () {
				var i = Math.floor(Math.random() * N);
				var c = cells[i];
				c.classList.add('exc');
				if (flag) flag.classList.add('on');
				setTimeout(function () {
					c.classList.remove('exc');
					if (flag) flag.classList.remove('on');
				}, 1600);
			}, 3800);

			// cells near the pointer lift (magnet), via rAF
			var mx = -1e4, my = -1e4, raf = null;
			function apply() {
				raf = null;
				cells.forEach(function (c) {
					var r = c.getBoundingClientRect();
					var dx = r.left + r.width / 2 - mx;
					var dy = r.top + r.height / 2 - my;
					var d = Math.hypot(dx, dy);
					c.style.transform = d < 85 ? 'translateY(' + (-4 * (1 - d / 85)).toFixed(1) + 'px)' : '';
				});
			}
			grid.parentElement.addEventListener('pointermove', function (e) {
				mx = e.clientX; my = e.clientY;
				if (!raf) raf = requestAnimationFrame(apply);
			});
			grid.parentElement.addEventListener('pointerleave', function () {
				mx = my = -1e4;
				if (!raf) raf = requestAnimationFrame(apply);
			});
		} else {
			// reduced motion: a calm static pattern with one marked cell
			cells.forEach(function (c, i) { if (i % 5 === 0) c.classList.add('tick'); });
			cells[10].classList.add('exc');
		}
	}

	/* ---------- hanging lanyard: spring pendulum + flip ---------- */
	var lanyard = document.getElementById('lanyard');
	var swing = document.getElementById('lanyardSwing');
	var card = document.getElementById('flipCard');
	if (lanyard && swing && card) {
		// flip (click / tap / Enter / Space via native button)
		var dragMoved = 0;
		card.addEventListener('click', function () {
			if (dragMoved > 8) return; // a drag, not a tap
			var flipped = card.classList.toggle('is-flipped');
			card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
		});

		if (!reduced) {
			// pendulum state: angle (deg), angular velocity
			var ang = 0, vel = 0, target = 0, dragging = false, lastX = 0, running = false;

			function loop() {
				// spring toward target with damping (approx. 60fps steps)
				var acc = (target - ang) * 0.015 - vel * 0.055;
				vel += acc;
				ang += vel;
				swing.style.transform = 'rotate(' + ang.toFixed(3) + 'deg)';
				if (Math.abs(vel) > 0.002 || Math.abs(ang - target) > 0.05) {
					requestAnimationFrame(loop);
				} else {
					swing.style.transform = 'rotate(' + target + 'deg)';
					running = false;
				}
			}
			function wake() { if (!running) { running = true; requestAnimationFrame(loop); } }

			// entrance: one gentle swing when the card scrolls into view
			var seen = new IntersectionObserver(function (en) {
				if (en[0].isIntersecting) { vel = 1.6; wake(); seen.disconnect(); }
			}, { threshold: 0.4 });
			seen.observe(lanyard);

			// pointer proximity: the card leans gently away from the cursor
			var contactEl = document.getElementById('contact');
			contactEl.addEventListener('pointermove', function (e) {
				if (dragging) return;
				var r = card.getBoundingClientRect();
				var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
				if (Math.abs(dx) < 2.2) { target = Math.max(-7, Math.min(7, -dx * 6)); wake(); }
			});
			contactEl.addEventListener('pointerleave', function () { target = 0; wake(); });

			// drag to swing: horizontal pulls add velocity, release keeps inertia
			card.addEventListener('pointerdown', function (e) {
				dragging = true; dragMoved = 0; lastX = e.clientX;
				card.setPointerCapture(e.pointerId);
			});
			card.addEventListener('pointermove', function (e) {
				if (!dragging) return;
				var dx = e.clientX - lastX;
				lastX = e.clientX;
				dragMoved += Math.abs(dx);
				vel += dx * 0.06;
				wake();
			});
			function endDrag() { dragging = false; target = 0; wake(); }
			card.addEventListener('pointerup', endDrag);
			card.addEventListener('pointercancel', endDrag);
		}
	}

	/* ---------- sticky cover offset for the dark finale ----------
	   #skills pins only once its own bottom reaches the viewport
	   bottom, so the dark section slides up and covers it. */
	var skills = document.getElementById('skills');
	function setStickyTop() {
		if (!skills) return;
		var top = Math.min(0, window.innerHeight - skills.offsetHeight - 40);
		skills.style.setProperty('--skills-top', top + 'px');
	}
	if (!reduced) {
		setStickyTop();
		window.addEventListener('resize', setStickyTop);
		window.addEventListener('load', setStickyTop);
	}
})();
