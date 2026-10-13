// Interaktivita webu Chata v Pekle. Bez knihoven, bez buildu.
(function () {
  'use strict'

  // Třídy gt-* na #q-app podle šířky okna (jako App.vue; první nastavení dělá vložený skript ve stránce)
  var koren = document.getElementById('q-app')
  window.addEventListener('resize', function () {
    var w = window.innerWidth
    ;[['xs', 600], ['sm', 1024], ['md', 1440], ['lg', 1920]].forEach(function (b) {
      koren.classList.toggle('gt-' + b[0], w >= b[1])
    })
  })

  // Mobilní menu: tlačítko .js-menu otevře/zavře body.menu-open
  var menuTlacitka = document.querySelectorAll('[aria-controls="menu-panel"]')
  function menu (otevrit) {
    document.body.classList.toggle('menu-open', otevrit)
    menuTlacitka.forEach(function (b) { b.setAttribute('aria-expanded', String(otevrit)) })
  }
  document.querySelectorAll('.js-menu').forEach(function (b) {
    b.addEventListener('click', function () { menu(!document.body.classList.contains('menu-open')) })
  })
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') menu(false)
  })

  // Hlavička se při scrollu dolů schová a při scrollu nahoru vrátí (q-header reveal v Layout.vue):
  // viditelná nahoře (do 250 px), při pohybu nahoru a prvních 100 px po změně směru
  var hlavicka = document.querySelector('.q-header')
  var minule = window.scrollY
  var smer = 'down'
  var zlom = minule
  window.addEventListener('scroll', function () {
    var y = window.scrollY
    var s = y < minule ? 'up' : 'down'
    if (y === minule) return
    if (s !== smer) { smer = s; zlom = minule }
    minule = y
    var ukaz = smer === 'up' || y <= 250 || y - zlom < 100 || document.body.classList.contains('menu-open')
    hlavicka.classList.toggle('q-header--hidden', !ukaz)
  }, { passive: true })

  // Swipe: zavolá vlevo()/vpravo() po vodorovném tahu jedním prstem > 40 px;
  // druhý prst gesto zruší, smi() (volitelné) ho může zakázat úplně. Použije ho lightbox (Task 5).
  function swipe (el, vlevo, vpravo, smi) {
    var x = null
    el.addEventListener('touchstart', function (e) {
      x = e.touches.length === 1 && (!smi || smi()) ? e.touches[0].clientX : null
    }, { passive: true })
    el.addEventListener('touchend', function (e) {
      if (x === null) return
      var dx = e.changedTouches[0].clientX - x
      x = null
      if (dx < -40) vlevo()
      if (dx > 40) vpravo()
    })
  }
})()
