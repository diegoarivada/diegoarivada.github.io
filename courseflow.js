const input = document.querySelector('#syllabus-input');
const list = document.querySelector('#assignments-list');
const count = document.querySelector('#assignment-count');
const message = document.querySelector('#parse-message');
let assignments = [];
const themeToggle = document.querySelector('#theme-toggle');
const savedTheme = localStorage.getItem('courseflow-theme');
if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
updateThemeToggle();
themeToggle.addEventListener('click', () => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.toggleAttribute('data-theme', !dark);
  if (!dark) document.documentElement.setAttribute('data-theme', 'dark');
  localStorage.setItem('courseflow-theme', dark ? 'light' : 'dark');
  updateThemeToggle();
});
function updateThemeToggle() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  themeToggle.textContent = dark ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(item => item.classList.remove('active'));
  tab.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
  document.querySelector(`#${tab.dataset.tab}-panel`).classList.remove('hidden');
}));

input.addEventListener('input', () => {
  const lines = input.value.split(/\r?\n/).filter(line => line.trim()).length;
  document.querySelector('#line-count').textContent = `${lines} line${lines === 1 ? '' : 's'} detected`;
});

document.querySelector('#file-input').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  document.querySelector('#file-name').textContent = `${file.name} selected`;
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    const reader = new FileReader();
    reader.onload = () => { input.value = reader.result; input.dispatchEvent(new Event('input')); document.querySelector('[data-tab="paste"]').click(); };
    reader.readAsText(file);
  } else {
    showMessage('PDF and Word files are ready to connect to document extraction.', false);
  }
});

document.querySelector('#parse-btn').addEventListener('click', () => {
  const parsed = input.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(parseLine).filter(Boolean);
  if (!parsed.length) { showMessage('Add at least one assignment with a date, such as “Essay — Sep 12”.', true); return; }
  assignments = parsed.sort((a, b) => a.date - b.date);
  renderAssignments();
  showMessage(`${assignments.length} deadline${assignments.length === 1 ? '' : 's'} added to your plan.`, false);
});

function parseLine(line) {
  const datePattern = /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i;
  const match = line.match(datePattern);
  if (!match) return null;
  const year = match[3] || new Date().getFullYear();
  const date = new Date(`${match[1]} ${match[2]}, ${year} 09:00:00`);
  const title = line.replace(match[0], '').replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, '').trim() || 'Assignment';
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 7);
  return { title, date, startDate, course: 'Imported syllabus', type: /exam|quiz|test/i.test(title) ? 'Exam' : 'Due' };
}

function renderAssignments() {
  count.textContent = assignments.length;
  list.innerHTML = assignments.map((item, index) => `<article class="assignment">
    <div class="date-box"><div><b>${item.date.getDate()}</b><small>${item.date.toLocaleString('en-US', { month: 'short' })}</small></div></div>
    <div><strong>${escapeHtml(item.title)}</strong><small>${item.course} · start by ${item.startDate.toLocaleString('en-US', { month: 'short', day: 'numeric' })}</small></div>
    <div class="assignment-actions"><span class="pill">${item.type}</span><button class="calendar-btn" data-index="${index}">＋ Calendar</button></div>
  </article>`).join('');
  list.querySelectorAll('.calendar-btn').forEach(button => button.addEventListener('click', () => downloadInvite(assignments[button.dataset.index])));
}

document.querySelector('#download-all').addEventListener('click', () => {
  if (!assignments.length) { showMessage('Import assignments first, then you can add them all at once.', true); return; }
  assignments.forEach(downloadInvite);
});

function downloadInvite(item) {
  const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(item.date.getTime() + 60 * 60 * 1000);
  const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//CourseFlow//EN\r\nBEGIN:VEVENT\r\nUID:${Date.now()}-${Math.random()}@courseflow\r\nDTSTAMP:${stamp(new Date())}\r\nDTSTART:${stamp(item.date)}\r\nDTEND:${stamp(end)}\r\nSUMMARY:${item.title}\r\nDESCRIPTION:Imported from CourseFlow syllabus planner.\r\nEND:VEVENT\r\nEND:VCALENDAR`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  link.download = `${item.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.querySelector('#add-material-btn').addEventListener('click', () => {
  const name = prompt('What material do you need?');
  if (!name || !name.trim()) return;
  const item = document.createElement('label');
  item.className = 'material-item';
  item.innerHTML = `<input type="checkbox"><span>${escapeHtml(name.trim())}</span><small>New material</small>`;
  document.querySelector('#materials-list').appendChild(item);
});
document.querySelector('#organize-btn').addEventListener('click', () => showMessage('Materials are organized by course and assignment.', false));
document.querySelector('#add-task-btn').addEventListener('click', () => {
  const task = prompt('What would you like to focus on?');
  if (task && task.trim()) showMessage(`“${task.trim()}” added to your focus list.`, false);
});
function showMessage(text, isError) { message.textContent = text; message.classList.toggle('error', isError); }
function escapeHtml(value) { return value.replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[character])); }
