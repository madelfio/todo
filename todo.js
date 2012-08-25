"use strict";

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

// Notifications

(function initNotifications() {
  var wn = window.webkitNotifications,
      rem_link = document.getElementById('enable-reminders'),
      interval = document.getElementById('interval'),
      reminder = null,
      notification = null;

  function scheduleReminder() {
    var min = document.getElementById('minutes').value || 1;
    var msec = min * 60 * 1000;
    console.log('scheduling reminder for ' + msec + ' milliseconds from now...');
    if (reminder) {clearTimeout(reminder);}
    reminder = setTimeout(function() {
      var now = new Date(),
          h = now.getHours() > 12 ? now.getHours() - 12 : now.getHours(),
          m = now.getMinutes() < 10 ? "0" + now.getMinutes() : now.getMinutes(),
          task = getActiveTask();
      console.log('Alert!');
      if (task) {
        if (notification) {notification.cancel();}
        notification = wn.createNotification('', h+':'+m + ' - Are you focused?', 'Current task: ' + task);
        notification.ondisplay = function(event) {setTimeout(function() {event.currentTarget.cancel();}, msec);};
        notification.onclick = function() {window.focus(); this.cancel();}
        window.onbeforeunload = function() {notification.cancel();}
        notification.show();
      }
      scheduleReminder();
    }, msec);
  }

  function enableReminders() {
    rem_link.style.display = 'none';
    interval.style.display = 'block';
    scheduleReminder();
  }

  function reqPerm() {
    wn.requestPermission();
    enableReminders();
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
})()
