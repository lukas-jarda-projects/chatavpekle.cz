// Interaktivita webu Chata v Pekle. Bez knihoven, bez buildu.
(function () {
  'use strict'
  var klid = window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
  // druhý prst gesto zruší, smi() (volitelné) ho může zakázat úplně
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

  // Fotky galerie se postupně objeví, jak vjíždějí do pohledu
  if (!klid && 'IntersectionObserver' in window) {
    var pozorovatel = new IntersectionObserver(function (zaznamy) {
      var n = 0
      zaznamy.forEach(function (z) {
        if (!z.isIntersecting) return
        z.target.style.setProperty('--zpozdeni', Math.min(n++, 8) * 60 + 'ms')
        z.target.classList.add('videt')
        pozorovatel.unobserve(z.target)
      })
    }, { rootMargin: '0px 0px -40px 0px' })
    document.querySelectorAll('.js-gallery').forEach(function (g) {
      g.classList.add('js-odhal')
      g.querySelectorAll('.gallery-item').forEach(function (a) { pozorovatel.observe(a) })
    })
  }

  // Lightbox: odkazy v .js-gallery > a[href] na velké foto; smyčka, šipky, Esc, swipe.
  // Otevření a zavření: fotka přeletí z náhledu a zpět (View Transitions, bez podpory prolnutí);
  // listování: stará fotka odjede a nová přijede ve směru kroku.
  var box = null
  var obr = null
  var seznam = []
  var poloha = 0
  var bezi = false
  var umiVT = !klid && typeof document.startViewTransition === 'function'
  function nic () {}
  function index (n) { return (n + seznam.length) % seznam.length }
  function nahled () { return seznam[poloha].querySelector('img') }
  function viditelny (el) {
    var r = el.getBoundingClientRect()
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight
  }
  // Načte a dekóduje velkou fotku, ať se do přechodu nedostane prázdný obrázek (nejdéle 1,5 s)
  function nacti (n) {
    var img = new Image()
    img.src = seznam[index(n)].href
    var dekod = img.decode ? img.decode().catch(nic) : Promise.resolve()
    return Promise.race([dekod, new Promise(function (r) { setTimeout(r, 1500) })])
  }
  function nastav (n) {
    poloha = index(n)
    obr.src = seznam[poloha].href
    obr.alt = nahled().alt
    new Image().src = seznam[index(poloha + 1)].href
    new Image().src = seznam[index(poloha - 1)].href
  }
  // Přechod uvnitř stránky; třída vt-lokal vypne proužek hlavního menu a nastaví délku prolnutí
  function prechod (zmena) {
    if (!umiVT) { zmena(); return Promise.resolve() }
    var html = document.documentElement
    html.classList.add('vt-lokal')
    return document.startViewTransition(zmena).finished.catch(nic).then(function () {
      html.classList.remove('vt-lokal')
    })
  }
  function otevri (n) {
    if (bezi) return
    bezi = true
    poloha = index(n)
    var maly = nahled()
    nacti(poloha).then(function () {
      var letet = umiVT && viditelny(maly)
      if (letet) maly.style.viewTransitionName = 'foto'
      return prechod(function () {
        maly.style.viewTransitionName = ''
        nastav(poloha)
        if (letet) obr.style.viewTransitionName = 'foto'
        box.hidden = false
        document.body.classList.add('lightbox-open')
        if (!umiVT && !klid && box.animate) box.animate([{ opacity: 0 }, { opacity: 1 }], 250)
      })
    }).then(function () {
      obr.style.viewTransitionName = ''
      bezi = false
    })
  }
  function zavri () {
    if (box.hidden) return
    zrusZoom(false)
    var maly = nahled()
    // Náhled mimo obraz posuň do pohledu (pod lightboxem to není vidět), ať má fotka kam doletět
    if (umiVT && !viditelny(maly)) maly.scrollIntoView({ block: 'center' })
    var polozka = seznam[poloha]
    polozka.style.transition = 'none'
    polozka.classList.add('videt')
    var letet = umiVT && viditelny(maly)
    if (letet) obr.style.viewTransitionName = 'foto'
    bezi = true
    prechod(function () {
      obr.style.viewTransitionName = ''
      if (letet) maly.style.viewTransitionName = 'foto'
      box.hidden = true
      document.body.classList.remove('lightbox-open')
    }).then(function () {
      maly.style.viewTransitionName = ''
      polozka.style.transition = ''
      bezi = false
    })
  }
  // Zoom v detailu: pinch dvěma prsty, posun jedním prstem nebo myší, dvojí ťuknutí / dvojklik,
  // kolečko myši. Transformace translate + scale s počátkem vlevo nahoře (CSS transform-origin: 0 0).
  var zoom = { s: 1, x: 0, y: 0 }
  var MAX_ZOOM = 4
  var prsty = new Map()
  var gesto = null
  var tahl = false
  var posledniTuk = null
  var posledniTyp = ''
  function priblizeno () { return zoom.s > 1.01 }
  // Omezí posun, aby fotka neujela z obrazu (menší než okno = na středu), a vykreslí ji
  function vykresli (plynule) {
    var lx = obr.offsetLeft
    var ly = obr.offsetTop
    var w = obr.offsetWidth * zoom.s
    var h = obr.offsetHeight * zoom.s
    var W = box.clientWidth
    var H = box.clientHeight
    zoom.x = w <= W ? (W - w) / 2 - lx : Math.min(-lx, Math.max(W - w - lx, zoom.x))
    zoom.y = h <= H ? (H - h) / 2 - ly : Math.min(-ly, Math.max(H - h - ly, zoom.y))
    obr.style.transition = plynule && !klid ? 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' : ''
    obr.style.transform = priblizeno() ? 'translate(' + zoom.x + 'px, ' + zoom.y + 'px) scale(' + zoom.s + ')' : ''
    obr.classList.toggle('priblizeno', priblizeno())
  }
  // Nové měřítko s; bod obrazovky (px, py) zůstane na stejném místě fotky
  function priblizNa (s, px, py, plynule) {
    var qx = (px - obr.offsetLeft - zoom.x) / zoom.s
    var qy = (py - obr.offsetTop - zoom.y) / zoom.s
    zoom.s = Math.max(1, Math.min(MAX_ZOOM, s))
    if (!priblizeno()) zoom.s = 1
    zoom.x = px - obr.offsetLeft - zoom.s * qx
    zoom.y = py - obr.offsetTop - zoom.s * qy
    vykresli(plynule)
  }
  function zrusZoom (plynule) {
    zoom.s = 1
    zoom.x = 0
    zoom.y = 0
    gesto = null
    prsty.clear()
    if (obr) vykresli(plynule)
  }
  function prepniZoom (px, py) {
    if (priblizeno()) zrusZoom(true)
    else priblizNa(2.5, px, py, true)
  }
  function dvaPrsty () {
    var b = Array.from(prsty.values())
    return { x: (b[0].x + b[1].x) / 2, y: (b[0].y + b[1].y) / 2, d: Math.hypot(b[0].x - b[1].x, b[0].y - b[1].y) || 1 }
  }
  function zacniPosun () {
    var b = prsty.values().next().value
    gesto = priblizeno() ? { typ: 'posun', px: b.x, py: b.y, x0: zoom.x, y0: zoom.y } : null
  }
  function pripravZoom () {
    obr.draggable = false
    box.addEventListener('pointerdown', function (e) {
      posledniTyp = e.pointerType
      // Prst na šipce se do pinche počítá (šipky leží přes okraje fotky na šířku), myš na tlačítku ne
      if (e.pointerType === 'mouse' && (e.button !== 0 || e.target.closest('button'))) return
      prsty.set(e.pointerId, { x: e.clientX, y: e.clientY })
      tahl = false
      if (prsty.size === 2) {
        var m = dvaPrsty()
        gesto = { typ: 'pinch', d0: m.d, s0: zoom.s,
          qx: (m.x - obr.offsetLeft - zoom.x) / zoom.s, qy: (m.y - obr.offsetTop - zoom.y) / zoom.s }
      } else if (prsty.size === 1) zacniPosun()
      if (gesto && e.pointerType === 'mouse') e.preventDefault()
    })
    box.addEventListener('pointermove', function (e) {
      if (!prsty.has(e.pointerId)) return
      prsty.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (!gesto) return
      tahl = true
      if (gesto.typ === 'pinch' && prsty.size >= 2) {
        var m = dvaPrsty()
        zoom.s = Math.max(1, Math.min(MAX_ZOOM, gesto.s0 * m.d / gesto.d0))
        zoom.x = m.x - obr.offsetLeft - zoom.s * gesto.qx
        zoom.y = m.y - obr.offsetTop - zoom.s * gesto.qy
      } else if (gesto.typ === 'posun') {
        zoom.x = gesto.x0 + e.clientX - gesto.px
        zoom.y = gesto.y0 + e.clientY - gesto.py
      }
      vykresli(false)
    })
    function konec (e) {
      if (!prsty.has(e.pointerId)) return
      var bod = prsty.get(e.pointerId)
      prsty.delete(e.pointerId)
      if (prsty.size === 1) zacniPosun()
      else gesto = null
      if (prsty.size === 0 && !priblizeno() && zoom.s !== 1) zrusZoom(true)
      // Dvojí ťuknutí prstem (dvojklik myši řeší dblclick)
      if (e.type === 'pointerup' && e.pointerType !== 'mouse' && !tahl && prsty.size === 0 && e.target === obr) {
        var ted = Date.now()
        if (posledniTuk && ted - posledniTuk.t < 300 && Math.hypot(bod.x - posledniTuk.x, bod.y - posledniTuk.y) < 30) {
          posledniTuk = null
          prepniZoom(bod.x, bod.y)
        } else posledniTuk = { t: ted, x: bod.x, y: bod.y }
      }
    }
    box.addEventListener('pointerup', konec)
    box.addEventListener('pointercancel', konec)
    obr.addEventListener('dblclick', function (e) {
      if (posledniTyp === 'mouse') prepniZoom(e.clientX, e.clientY)
    })
    box.addEventListener('wheel', function (e) {
      if (box.hidden) return
      e.preventDefault()
      priblizNa(zoom.s * Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY, false)
    }, { passive: false })
    window.addEventListener('resize', function () { if (!box.hidden && priblizeno()) vykresli(false) })
  }
  function ukazFoto (n) {
    if (bezi || box.hidden) return
    zrusZoom(false)
    var smer = n > poloha ? 1 : -1
    if (klid || !obr.animate) { nastav(n); return }
    bezi = true
    var ven = obr.animate([
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: 'translateX(' + (-smer * 48) + 'px)' }
    ], { duration: 160, easing: 'ease-in', fill: 'forwards' })
    Promise.all([ven.finished, nacti(n)]).then(function () {
      nastav(n)
      return obr.decode ? obr.decode().catch(nic) : null
    }).then(function () {
      ven.cancel()
      return obr.animate([
        { opacity: 0, transform: 'translateX(' + (smer * 48) + 'px)' },
        { opacity: 1, transform: 'none' }
      ], { duration: 220, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }).finished
    }).catch(nic).then(function () { bezi = false })
  }
  function vytvorBox () {
    box = document.createElement('div')
    box.className = 'lightbox'
    box.hidden = true
    box.innerHTML = '<button class="lb-close" aria-label="Zavřít">&times;</button>' +
      '<button class="lb-prev" aria-label="Předchozí">&#8249;</button>' +
      '<img alt="">' +
      '<button class="lb-next" aria-label="Další">&#8250;</button>'
    document.body.appendChild(box)
    obr = box.querySelector('img')
    box.querySelector('.lb-close').addEventListener('click', zavri)
    box.querySelector('.lb-prev').addEventListener('click', function () { ukazFoto(poloha - 1) })
    box.querySelector('.lb-next').addEventListener('click', function () { ukazFoto(poloha + 1) })
    // Klik na tmavé pozadí zavře, ale ne konec tažení přiblížené fotky
    box.addEventListener('click', function (e) { if (e.target === box && !tahl) zavri() })
    swipe(box, function () { ukazFoto(poloha + 1) }, function () { ukazFoto(poloha - 1) }, function () { return !priblizeno() })
    pripravZoom()
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return
      if (e.key === 'Escape') zavri()
      if (e.key === 'ArrowLeft') ukazFoto(poloha - 1)
      if (e.key === 'ArrowRight') ukazFoto(poloha + 1)
    })
  }
  document.querySelectorAll('.js-gallery').forEach(function (g) {
    var odkazy = Array.prototype.slice.call(g.querySelectorAll('a[href]'))
    odkazy.forEach(function (a, j) {
      a.addEventListener('click', function (e) {
        e.preventDefault()
        if (!box) vytvorBox()
        if (bezi) return
        seznam = odkazy
        otevri(j)
      })
    })
  })
})()
