"use strict";


// Todo list editor (based on CodeMirror)

(function () {
  var cm = null;
  var lineTypes = ['', '+', 'X', '#'];

  function getLineStatus(line) {
    var txt = (cm.getLine(line) || '').replace(/^\s+/,'');
    if (lineTypes.indexOf(txt[0]) > -1) {return txt[0];}
    else {return '';}
  }

  function handleGutterClick(ed, line, event) {
    var old_status = getLineStatus(line),
        base_line = cm.getLine(line);
    if (old_status === '+') {  // active => closed
      base_line = base_line.replace(/\+/, 'X');
    } else if (old_status === 'X') {  // closed => pending
      base_line = base_line.replace(/X\s*/, '');
    } else if (old_status === '') {  // pending => active
      base_line = '+ ' + base_line;
    }
    cm.setLine(line, base_line);
    autoMark(line);
  }

  function handleTextChange(ed, change) {
    var from = change.from.line;
    var to = Math.max(change.to.line, change.from.line + change.text.length);
    for (var line=from; line <= to; line++) {
      autoMark(line);
    }
  }

  function autoMark(line) {
    if (getLineStatus(line) == '+') {
      cm.setMarker(line, '&#x25CF;');
    } else {
      cm.clearMarker(line);
    }
  }

  var config = {
    value: 'Enter Tasks Here',
    mode: 'todo',
    theme: 'ambiance',
    gutter: true,
    fixedGutter: true,
    autofocus: true,
    onGutterClick: handleGutterClick,
    onChange: handleTextChange
  }
  cm = CodeMirror(document.getElementById('todo'), config);

  function resizeCM() {
    function winHeight() {
      return window.innerHeight || (document.documentElement || document.body).clientHeight;
    }
    cm.getGutterElement().style.height = (winHeight() - 180) + 'px';
    cm.getScrollerElement().style.height = (winHeight() - 180) + 'px';
  }
  resizeCM();
  setTimeout(resizeCM, 1000);
  CodeMirror.connect(window, 'resize', resizeCM);

  function getActiveTask() {
    var num_lines = cm.lineCount();
    for (var line = 0; line < num_lines; line++) {
      if (getLineStatus(line) == '+') {
        return cm.getLine(line).replace(/\s*\+\s*/,'');
      }
    }
    return null;
  }

  // export getActiveTask for notifications
  window.getActiveTask = getActiveTask;

  // export CodeMirror set/get text for storage
  window.setTodoText = cm.setValue;
  window.getTodoText = cm.getValue;
})();


// Notifications

(function () {
  var wn = window.webkitNotifications,
      rem_link = document.getElementById('enable-reminders'),
      interval = document.getElementById('interval'),
      reminder = null,
      notification = null;

  function getTimeString() {
    var now = new Date(),
        h = now.getHours() > 12 ? now.getHours() - 12 : now.getHours(),
        m = now.getMinutes() < 10 ? "0" + now.getMinutes() : now.getMinutes();
    return h+':'+m;
  }

  function createNotification() {
    if (wn.checkPermission() === 0) {
      var time_str = getTimeString(),
          task = getActiveTask();

      // show reminder about active task if one exists
      if (task) {
        if (notification) {notification.cancel();}

        notification = wn.createNotification( '', time_str + ' - Are you focused?', 'Current task: ' + task);
        notification.ondisplay = function(event) {setTimeout(function() {event.currentTarget.cancel();}, msec);};
        notification.onclick = function() {window.focus(); this.cancel();}
        notification.show();
      }
    }
  }

  function scheduleReminder() {
    var min = document.getElementById('minutes').value || 1,
        msec = min * 60 * 1000;
    if (reminder) {clearTimeout(reminder);}
    reminder = setTimeout(function() {createNotification(); scheduleReminder();}, msec);
  }

  // Permissions

  function enableReminders() {
    rem_link.style.display = 'none';
    interval.style.display = 'block';
    scheduleReminder();
  }

  function checkPerm() {
    if (wn.checkPermission()) {
      enableReminders();
    } else {
      setTimeout(checkPerm, 1000);
    }
  }

  function reqPerm() {
    wn.requestPermission();
    checkPerm();
  }

  if (wn) {
    console.log('Notifications are supported.');
    if (wn.checkPermission()) {
      rem_link.addEventListener('click', reqPerm);
    } else {
      enableReminders();
    }
  } else {
    document.getElementById('reminders').innerHTML = 'Reminders not available for this browser/OS';
    console.log('Notifications not supported for this Browser/OS.');
  }
})();


// Storage

(function () {
  function supports_html5_storage() {
    try {return 'localStorage' in window && window.localStorage !== null;}
    catch (e) {return false;}
  }

  var state_attrs = ['text', 'interval_mins']

  function saveState(state) {
    if (!supports_html5_storage()) {return;}

    for (var i = 0; i < state_attrs.length; i++) {
      if (state_attrs[i] in state) {
        localStorage.setItem(state_attrs[i], state[state_attrs[i]]);
      }
    }
  }

  function loadState() {
    if (!supports_html5_storage()) {return {};}

    var state = {};

    for (var i=0; i < state_attrs.length; i++) {
      if (localStorage.getItem(state_attrs[i])) {
        state[state_attrs[i]] = localStorage.getItem(state_attrs[i]);
      }
    }
    return state;
  }

  var tried_loading = false;
  function storageCheck() {
    var state;
    if (!tried_loading) {
      state = loadState();
      if ('text' in state) {setTodoText(state.text);}
      if ('interval_mins' in state) {
        document.getElementById('minutes').value = state.interval_mins;
      }
      tried_loading = true;
    } else {
      console.log('saving...');
      state = {
        text: getTodoText(),
        interval_mins: document.getElementById('minutes').value || 1
      }
      saveState(state);
    }
  }
  storageCheck();
  setInterval(storageCheck, 1000);

})();
