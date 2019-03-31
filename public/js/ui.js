(function () {
  "use strict";

  // keydown processing delay, in milliseconds
  var INPUT_DELAY = 200;

  // time thresholds.  if a crack time is above the maximum,
  // then display a success icon, and if the time is below the
  // minimum, then display a warning icon
  var TIMES = {
    max: 315360000, // > 10 years
    min: 31536000, // < 1 year
  };

  // map scores to strength text and bar style
  var SCORES = [{
    text: 'Garbage',
    bar_css: 'is-danger',
  }, {
    text: 'Poor',
    bar_css: 'is-danger',
  }, {
    text: 'Decent',
    bar_css: 'is-warning',
  }, {
    text: 'Decent',
    bar_css: 'is-primary',
  }, {
    text: 'Good',
    bar_css: 'is-success',
  }];

  var TIME_ICONS = [{
    css: '#icon-online-slow',
    key: 'online_throttling_100_per_hour',
  },  {
    css: '#icon-online-fast',
    key: 'online_no_throttling_10_per_second',
  }, {
    css: '#icon-offline-slow',
    key: 'offline_slow_hashing_1e4_per_second',
  }, {
    css: '#icon-offline-fast', 
    key: 'offline_fast_hashing_1e10_per_second',
  }];

  // result elements and mapping functions
  var ROWS = [{
    id: 'guesses',
    fn: function(r) {
      return Math.round(r.guesses);
    },
  }, {
    id: 'guesses-log10',
    fn: function(r) {
      return Math.round(r.guesses_log10 * 10) / 10.0;
    },
  }, {
    id: 'score',
    fn: function(r) {
      return Math.round(r.score / 4.0 * 100) + '%';
    },
  }, {
    id: 'time-online-slow',
    fn: function(r) {
      return r.crack_times_display.online_throttling_100_per_hour;
    },
  }, {
    id: 'time-online-fast',
    fn: function(r) {
      return r.crack_times_display.online_no_throttling_10_per_second;
    },
  }, {
    id: 'time-offline-slow',
    fn: function(r) {
      return r.crack_times_display.offline_slow_hashing_1e4_per_second;
    },
  }, {
    id: 'time-offline-fast',
    fn: function(r) {
      return r.crack_times_display.offline_fast_hashing_1e10_per_second;
    },
  }, {
    id: 'warning',
    fn: function(r) {
      var fb = r.feedback;
      return (fb && fb.warning) ? h(fb.warning) : '';
    },
  }, {
    id: 'suggestions',
    fn: function(r) {
      var fb = r.feedback;

      if (fb && fb.suggestions && fb.suggestions.length > 0) {
        return r.feedback.suggestions.map(function(text) {
          return '<li>' + h(text) + '</li>';
        }).join('');
      } else {
        return '';
      }
    },
  }, {
    id: 'strength',
    fn: function(r) {
      return h(SCORES[+r.score].text);
    },
  }, {
    id: 'tests',
    fn: function(r) {
      return r.sequence.map(function(row) {
        return '<tr>' + 
          '<td>' + h(row.pattern) + '</td>' +
          '<td>' + h(row.guesses) + '</td>' +
        '</tr>';
      }).join('');
    },
  }];

  // get element
  function get(id) {
    var el = document.getElementById(id);

    if (!el) {
      throw new Error('unknown element: ' + id);
    }

    return el;
  }

  // hide elements
  function hide() {
    for (var i = 0; i < arguments.length; i++) {
      get(arguments[i]).style.display = 'none';
    }
  }

  // show elements
  function show() {
    for (var i = 0; i < arguments.length; i++) {
      get(arguments[i]).style.display = 'block';
    }
  }

  // html-escape input string
  function h(s) {
    return ('' + s).replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&apos;');
  }

  // show selected tab
  function show_tab(parent_css, tab_el) {
    // clear tabs
    document.querySelectorAll(parent_css + ' .tabs li').forEach(function(el) {
      el.classList.remove('is-active');
    });

    // hide content panes
    document.querySelectorAll(parent_css + ' .content').forEach(function(el) {
      el.classList.add('is-hidden');
    });

    // select current tab, show current tab pane
    tab_el.parentElement.classList.add('is-active');
    get(tab_el.parentElement.dataset['id']).classList.remove('is-hidden');
  }

  // run with given password
  function run(password) {
    // hide wrappers
    hide('results-wrap', 'empty-password-wrap');

    if (password.length > 0) {
      // score password
      var r = zxcvbn(get('password').value);

      // log results (debug)
      console.log(r);

      // update result rows
      ROWS.forEach(function(row) {
        get(row.id).innerHTML = row.fn(r);
      });

      // show/hide feedback wrappers
      ['warning', 'suggestions'].forEach(function(id) {
        if (r.feedback && r.feedback[id] && r.feedback[id].length > 0) {
          show(id + '-wrap');
        } else {
          hide(id + '-wrap');
        }
      });

      // get score bar
      var bar = get('score');

      // clear current score bar style
      SCORES.forEach(function(row) {
        bar.classList.remove(row.bar_css);
      });

      // update score bar width and color
      bar.value = Math.floor((1 + r.score) / 5.0 * 100);
      bar.classList.add(SCORES[+r.score].bar_css);

      // hide all time icons
      document.querySelectorAll('#tab-details-times td .fa').forEach(function(el) {
        el.classList.add('is-hidden');
        el.classList.remove('has-text-danger');
        el.classList.remove('has-text-success');
        el.classList.remove('fa-warning');
        el.classList.remove('fa-check-circle');
      });

      // update time icons
      TIME_ICONS.forEach(function(row) {
        var el = document.querySelector(row.css),
            time = r.crack_times_seconds[row.key];

        if (time > 315360000) {  // > 10 years
          el.classList.remove('is-hidden');
          el.classList.add('has-text-success');
          el.classList.add('fa-check-circle');
        } else if (time < 31536000) { // < 1 year
          el.classList.remove('is-hidden');
          el.classList.add('has-text-danger');
          el.classList.add('fa-warning');
        } 
      });

      // show results wrapper
      show('results-wrap');
    } else {
      // show empty password text wrapper
      show('empty-password-wrap');
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    var timeout = null;

    // bind to keydown
    get('password').addEventListener('keydown', function() {
      if (timeout !== null) {
        // clear existing timeout
        clearTimeout(timeout);
        timeout = null;
      }

      // set new timeout with a 100ms delay
      timeout = setTimeout(function() {
        // clear existing timeout
        timeout = null;

        // run
        run(get('password').value);
      }, INPUT_DELAY);
    }, false);

    // focus input element, catch/ignore error
    try {
      get('password').focus();
    } catch (e) {}

    // run once with empty password
    run('');
  }, false);

  // init show password button
  get('show-password').addEventListener('click', function() {
    setTimeout(function() {
      var show = get('show-password').checked;

      // toggle password field
      get('password').type = show ? 'text' : 'password';
    }, 0);
  });

  // init tabs
  ['#details', '#help'].forEach(function(parent_css) {
    document.querySelectorAll(parent_css + ' .tabs a').forEach(function(el) {
      el.addEventListener('click', function() {
        // show tab
        show_tab(parent_css, el);

        // stop event
        return false;
      }, false);
    });
  });
})();
