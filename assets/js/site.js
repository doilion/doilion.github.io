/* Site behaviour: navigation, in-page scrolling, image lightbox, Google Scholar list.
   Depends on the vendor bundle in main.min.js (jQuery, Magnific Popup, Smooth Scroll). */
(function ($) {
  'use strict';

  $(function () {
    var header = document.querySelector('.site-header');
    var headerHeight = header ? header.offsetHeight : 0;

    // External links open in a new tab; in-page links stay put.
    $('a[href^="http"]').each(function () {
      if (this.hostname && this.hostname !== window.location.hostname) {
        this.target = '_blank';
        this.rel = 'noopener';
      }
    });

    // Land headings below the sticky header when following in-page links.
    if ($.fn.smoothScroll) {
      $('a').smoothScroll({ offset: -(headerHeight + 16) });
    }

    // Click a paper figure to view it full size.
    if ($.fn.magnificPopup) {
      $('.image-popup').magnificPopup({
        type: 'image',
        tLoading: '加载中…',
        tClose: '关闭 (Esc)',
        gallery: {
          enabled: true,
          navigateByImgClick: true,
          preload: [0, 1],
          tPrev: '上一张',
          tNext: '下一张',
          tCounter: '%curr% / %total%'
        },
        image: { tError: '图片加载失败' },
        removalDelay: 300,
        mainClass: 'mfp-zoom-in',
        closeOnContentClick: true,
        midClick: true
      });
    }

    // Highlight the nav link of the section currently in view.
    var navLinks = $('#page-nav a[href^="#"]');
    var sections = navLinks.map(function () {
      return document.getElementById(this.getAttribute('href').slice(1));
    }).get();
    var ticking = false;

    function highlight() {
      ticking = false;
      var line = headerHeight + 32;
      var current = sections[0];
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= line) current = sections[i];
      }
      var atBottom = window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 2;
      if (atBottom) current = sections[sections.length - 1];
      navLinks.each(function () {
        var active = current && this.getAttribute('href') === '#' + current.id;
        this.classList.toggle('is-active', !!active);
      });
    }

    if (sections.length) {
      $(window).on('scroll resize', function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(highlight);
        }
      });
      highlight();
    }

    initNav();

    loadScholar();
  });

  // Top navigation: links that do not fit move into a small overflow menu.
  function initNav() {
    var nav = document.getElementById('page-nav');
    if (!nav) return;
    var visible = nav.querySelector('.visible-links');
    var overflow = nav.querySelector('.hidden-links');
    var button = nav.querySelector('button');

    function setOpen(open) {
      overflow.classList.toggle('hidden', !open);
      button.classList.toggle('close', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function fit() {
      setOpen(false);
      while (overflow.firstElementChild) visible.appendChild(overflow.firstElementChild);
      button.classList.add('hidden');
      if (visible.offsetWidth <= nav.clientWidth) return;

      button.classList.remove('hidden');
      var room = nav.clientWidth - button.offsetWidth - 8;
      while (visible.children.length > 1 && visible.offsetWidth > room) {
        overflow.insertBefore(visible.lastElementChild, overflow.firstElementChild);
      }
    }

    button.addEventListener('click', function (event) {
      event.stopPropagation();
      setOpen(overflow.classList.contains('hidden'));
    });
    overflow.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fit, 100);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    fit();
  }

  // Full publication list, synced from Google Scholar by a scheduled workflow.
  function loadScholar() {
    var box = document.getElementById('gs-pubs');
    var list = document.getElementById('gs-pub-list');
    if (!window.GS_DATA_URL) return;

    $.getJSON(window.GS_DATA_URL, function (data) {
      var pubs = data.publications || {};

      // Per-paper citation counts: <span class="show_paper_citations" data="PUB_ID"></span>
      $('.show_paper_citations').each(function () {
        var pub = pubs[this.getAttribute('data')];
        if (pub) this.textContent = '被引 ' + pub.num_citations;
      });

      if (!box || !list) return;
      var items = Object.keys(pubs).map(function (id) {
        var p = pubs[id], bib = p.bib || {};
        return {
          id: id,
          title: bib.title || '',
          year: parseInt(bib.pub_year, 10) || 0,
          venue: bib.citation || '',
          cites: p.num_citations || 0
        };
      }).filter(function (p) { return p.title; });
      if (!items.length) return;
      items.sort(function (a, b) { return (b.year - a.year) || (b.cites - a.cites); });

      var scholarId = data.scholar_id;
      items.forEach(function (p) {
        var li = document.createElement('li');
        var title = document.createElement(scholarId ? 'a' : 'span');
        title.className = 'gs-pubs__item-title';
        title.textContent = p.title;
        if (scholarId) {
          title.href = 'https://scholar.google.com/citations?view_op=view_citation&user=' +
            encodeURIComponent(scholarId) + '&citation_for_view=' + encodeURIComponent(p.id);
          title.target = '_blank';
          title.rel = 'noopener';
        }
        li.appendChild(title);
        var meta = document.createElement('span');
        meta.className = 'gs-pubs__item-meta';
        var parts = [];
        if (p.venue) parts.push(p.venue);
        else if (p.year) parts.push(String(p.year));
        if (p.cites > 0) parts.push('被引 ' + p.cites);
        meta.textContent = parts.join(' · ');
        li.appendChild(meta);
        list.appendChild(li);
      });

      var total = document.getElementById('gs-total');
      if (total && data.citedby != null) {
        total.textContent = '共 ' + items.length + ' 篇 · 总被引 ' + data.citedby;
      }
      var updated = document.getElementById('gs-updated');
      if (updated && data.updated) {
        updated.textContent = '，更新于 ' + String(data.updated).slice(0, 10);
      }
      box.hidden = false;
    });
  }
})(jQuery);
