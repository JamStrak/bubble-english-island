import { guides, islands } from './lessons.js';
import { prepareOffline } from './offline.js';

const app = document.querySelector('#app');
const voice = document.querySelector('#voice');
const parents = document.querySelector('#parents');
const storageNote = document.querySelector('#storage-note');
const storageKey = 'bubble-english-island.shells.v1';
const validIds = new Set(islands.flatMap(island => island.lessons.map(lesson => lesson.id)));
const steps = [
  ['听一听', '点大喇叭，听泡泡说英语。', '🎧'],
  ['找一找', '先听英语，再点一张图。', '🔍'],
  ['说一说', '点喇叭再听一次，跟着泡泡一起说。', '💬']
];

const speaker = '<span class="speaker-shape" aria-hidden="true"><i></i><b></b></span>';
const escape = value => String(value).replace(/[&<>"']/g, char => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));

let completed = readShells();
let session;
let playId = 0;
let lastDialogFocus;

function readShells() {
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(ids) ? [...new Set(ids.filter(id => validIds.has(id)))] : [];
  } catch {
    storageNote.hidden = false;
    return [];
  }
}

function storeShell(id) {
  completed = [...new Set([...completed, ...readShells(), id])];
  try {
    localStorage.setItem(storageKey, JSON.stringify(completed));
  } catch {
    storageNote.hidden = false;
  }
}

function countFor(island) {
  return island.lessons.filter(lesson => completed.includes(lesson.id)).length;
}

function refreshShells() {
  document.querySelector('#collection b').textContent = completed.length;
}

function goTo(content, focus) {
  app.innerHTML = content;
  window.scrollTo(0, 0);
  if (focus) app.querySelector('h1').focus({ preventScroll: true });
  refreshShells();
}

function renderHome(focus = true) {
  stopVoice();
  session = undefined;
  const next = islands.find(island => countFor(island) < island.lessons.length) || islands[0];
  const action = completed.length === 0 ? '出发玩英语' :
    completed.length === validIds.size ? '再玩一次' : '继续探险';
  goTo(`
    <section class="hero">
      <div class="hero-copy">
        <p class="hero-greeting" lang="en"><span aria-hidden="true">✦</span> Hello, little explorer!</p>
        <h1 tabindex="-1">泡泡英语岛<span aria-hidden="true">.</span></h1>
        <p>听泡泡说英语，找图、开口，<br>把贝壳带回家。</p>
        <button class="primary hero-start" data-action="start" data-island="${escape(next.id)}">
          <span aria-hidden="true">▶</span> ${action}
        </button>
      </div>
      <picture class="hero-picture"><img src="./art/island.webp" alt="泡泡抱着金色贝壳，和你在小岛上见面" fetchpriority="high" width="900" height="600"></picture>
    </section>
    <section class="places" aria-labelledby="places-title">
      <div class="section-heading">
        <h2 id="places-title">想去哪里玩？</h2>
        <span>一次玩一个地方</span>
      </div>
      <div class="island-grid">
        ${islands.map((island, index) => {
          const count = countFor(island);
          return `<button class="island-card island-card-${index}" data-action="start" data-island="${escape(island.id)}">
            <span class="island-emoji" aria-hidden="true">${escape(island.emoji)}</span>
            <span class="island-text">
              <strong>${escape(island.title)}</strong>
              <span class="island-english" lang="en">${escape(island.english || '')}</span>
              <span class="island-progress" aria-label="已收集 ${count} 枚贝壳，共 ${island.lessons.length} 枚">
                ${island.lessons.map((_, lessonIndex) => `<i class="${lessonIndex < count ? 'lit' : ''}" aria-hidden="true"></i>`).join('')}
              </span>
            </span>
            <span class="island-arrow" aria-hidden="true">→</span>
          </button>`;
        }).join('')}
      </div>
    </section>`, focus);
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function setLesson(index) {
  const lesson = session.island.lessons[index];
  const otherLessons = session.island.lessons.filter(other => other.id !== lesson.id);
  session.lesson = lesson;
  session.index = index;
  session.step = 0;
  session.heard = false;
  session.matched = false;
  session.choices = shuffle([lesson, ...shuffle(otherLessons).slice(0, 2)]);
  renderLesson();
}

function startIsland(island) {
  if (!island) return;
  const remaining = island.lessons.map((lesson, index) => (
    completed.includes(lesson.id) ? -1 : index
  )).filter(index => index >= 0);
  const queue = remaining.length ? remaining : island.lessons.map((_, index) => index);
  session = { island, queue, acquired: 0 };
  setLesson(queue.shift());
}

function lessonArt(lesson) {
  const fallback = `<span aria-hidden="true">${escape(lesson.emoji)}</span>`;
  return lesson.picture ? `<img src="${escape(lesson.picture)}" alt="" width="220" height="170">` + fallback : fallback;
}

function renderLesson() {
  stopVoice();
  const { island, lesson, index, step, choices } = session;
  const [verb, description, emoji] = steps[step];
  const playback = `<button class="listen-button" data-action="play" aria-label="播放英文" aria-pressed="false">
    ${speaker}<strong class="play-caption">听英语</strong></button>`;
  const prompt = step === 1 ? `
    ${playback}
    <div class="choices">
      ${choices.map(choice => `<button class="choice" aria-label="${escape(choice.chinese)}" data-action="choose" data-choice="${escape(choice.id)}">
        <span class="choice-art">${lessonArt(choice)}</span>
        ${choice.picture ? `<span class="choice-sticker" aria-hidden="true">${escape(choice.emoji)}</span>` : ''}
        <span class="choice-mark" aria-hidden="true"></span>
      </button>`).join('')}
    </div>` : `
    <div class="listen-layout">
      <div class="phrase-art">${lessonArt(lesson)}</div>
      <div class="phrase">
        <p lang="en">${escape(lesson.english)}</p>
        <span>${escape(lesson.chinese)}</span>
        ${playback}
      </div>
    </div>`;
  goTo(`
    <div class="trip-top">
      <button class="secondary" data-action="home">← 回小岛</button>
      <span class="location"><span aria-hidden="true">${escape(island.emoji)}</span> ${escape(island.title)} · ${index + 1}/${island.lessons.length}</span>
    </div>
    <section class="practice step-${step}">
      <div class="step-track" aria-label="第 ${step + 1} 步，共三步">
        ${steps.map(([title, , icon], item) => `<span class="${item === step ? 'current' : ''}" ${item === step ? 'aria-current="step"' : ''}><i aria-hidden="true">${icon}</i> ${title}</span>`).join('')}
      </div>
      <h1 tabindex="-1"><span aria-hidden="true">${emoji}</span> ${verb}</h1>
      <div class="prompt-line"><p class="step-description">${description}</p><button class="guide-button" data-action="guide" aria-label="播放中文玩法" aria-pressed="false">🔊 <span>听玩法</span></button></div>
      ${prompt}
      <p class="feedback" role="status" id="feedback"></p>
      <button class="primary next-button" data-action="next" disabled>
        ${['去找图 →', '去说一说 →', '我说完啦 ✓'][step]}
      </button>
    </section>`, true);
  if (step === 2) app.querySelector('[data-action="next"]').disabled = false;
}

function refreshVoiceButton() {
  const button = app.querySelector('[data-action="play"]');
  if (!button) return;
  const playing = !voice.paused && !voice.ended;
  const playingEnglish = playing && voice.getAttribute('src') === session?.lesson.audio;
  button.setAttribute('aria-pressed', String(playingEnglish));
  button.setAttribute('aria-label', playingEnglish ? '暂停英文' : '播放英文');
  button.querySelector('.play-caption').textContent = playingEnglish ? '在播放' : '听英语';
  app.querySelector('.guide-button')?.setAttribute('aria-pressed', String(playing && !playingEnglish));
}

function stopVoice() {
  playId++;
  voice.onended = null;
  voice.onpause = null;
  voice.onerror = null;
  voice.pause();
  if (voice.hasAttribute('src')) {
    voice.removeAttribute('src');
    voice.load();
  }
  refreshVoiceButton();
}

async function playLesson(isGuide = false) {
  if (!session) return;
  const src = isGuide ? guides[['listen', 'choose', 'speak'][session.step]] : session.lesson.audio;
  if (!voice.paused && voice.getAttribute('src') === src) {
    voice.pause();
    return;
  }
  const id = ++playId;
  const feedback = app.querySelector('#feedback');
  if (voice.getAttribute('src') !== src || voice.error) {
    voice.src = src;
  } else if (voice.ended) {
    voice.currentTime = 0;
  }
  const failed = () => {
    if (id !== playId) return;
    feedback.textContent = '声音没播出来，再点一下喇叭。';
    refreshVoiceButton();
  };
  voice.onpause = refreshVoiceButton;
  voice.onerror = failed;
  voice.onended = () => {
    if (id !== playId) return;
    refreshVoiceButton();
    if (isGuide) return;
    session.heard = true;
    if (session.step === 0) {
      feedback.textContent = '听完啦！';
      app.querySelector('[data-action="next"]').disabled = false;
    } else if (session.step === 1 && !session.matched) {
      feedback.textContent = '来点一张图吧。';
    }
  };
  if (feedback.textContent.startsWith('声音')) feedback.textContent = '';
  try {
    await voice.play();
    if (id === playId) refreshVoiceButton();
  } catch (error) {
    if (error.name !== 'AbortError') failed();
  }
}

function choose(button) {
  if (session.step !== 1 || session.matched || button.getAttribute('aria-disabled') === 'true') return;
  const feedback = app.querySelector('#feedback');
  if (!session.heard) {
    feedback.textContent = '先点喇叭听一句。';
    return;
  }
  const matched = button.dataset.choice === session.lesson.id;
  button.classList.add(matched ? 'right' : 'try-again');
  button.setAttribute('aria-disabled', 'true');
  button.querySelector('.choice-mark').textContent = matched ? '✓' : '·';
  feedback.textContent = matched ? '找对啦！' : '再听一次，换一张图试试。';
  if (matched) {
    session.matched = true;
    app.querySelectorAll('.choice').forEach(choice => choice.setAttribute('aria-disabled', 'true'));
    app.querySelector('[data-action="next"]').disabled = false;
  }
}

function nextStep() {
  if (!session) return;
  if ((session.step === 0 && !session.heard) || (session.step === 1 && !session.matched)) return;
  if (session.step < 2) {
    session.step++;
    session.heard = false;
    renderLesson();
    return;
  }
  if (!completed.includes(session.lesson.id)) session.acquired++;
  storeShell(session.lesson.id);
  if (session.queue.length) {
    setLesson(session.queue.shift());
    return;
  }
  stopVoice();
  const { island, acquired } = session;
  goTo(`
    <section class="practice celebration">
      <div class="big-shell" aria-hidden="true"><span>✧</span>🐚<span>✦</span></div>
      <p class="celebration-place">${escape(island.title)}</p>
      <h1 tabindex="-1">探险成功！</h1>
      <p>${acquired ? `你带回了 <strong>${acquired} 枚贝壳</strong>。` : '这些英语，你又开口说了一遍。'}</p>
      <button class="primary" data-action="home">回小岛 →</button>
    </section>`, true);
  session = undefined;
}

function openParents() {
  if (parents.hasAttribute('open')) return;
  voice.pause();
  lastDialogFocus = document.activeElement;
  if (typeof parents.showModal === 'function') parents.showModal();
  else {
    parents.setAttribute('open', '');
    document.body.classList.add('legacy-modal');
  }
  parents.querySelector('.close-dialog').focus();
}

function closeParents() {
  if (typeof parents.close === 'function') parents.close();
  else {
    parents.removeAttribute('open');
    document.body.classList.remove('legacy-modal');
  }
  lastDialogFocus?.focus();
}

async function refreshOffline() {
  const badge = document.querySelector('#offline-badge');
  const label = badge.querySelector('strong');
  const detail = document.querySelector('#offline-detail');
  const retry = document.querySelector('#offline-retry');
  badge.dataset.state = 'loading';
  label.textContent = '正在准备离线包';
  detail.textContent = '正在保存全部插图和声音，请保持当前页面打开。';
  retry.hidden = true;
  try {
    await prepareOffline();
    badge.dataset.state = 'ready';
    label.textContent = '离线已就绪';
    detail.textContent = '全部练习和声音已保存在这里，可以断网使用。';
  } catch (error) {
    badge.dataset.state = 'error';
    label.textContent = '离线包待准备';
    detail.textContent = error.message;
    retry.hidden = false;
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  if (parents.hasAttribute('open') && !parents.contains(button)) return;
  switch (button.dataset.action) {
    case 'home': renderHome(); break;
    case 'start': startIsland(islands.find(island => island.id === button.dataset.island)); break;
    case 'play': playLesson(); break;
    case 'guide': playLesson(true); break;
    case 'choose': choose(button); break;
    case 'next': nextStep(); break;
    case 'parents': openParents(); break;
    case 'close-parents': closeParents(); break;
    case 'retry-offline': refreshOffline(); break;
  }
});
parents.addEventListener('close', () => lastDialogFocus?.focus());
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('legacy-modal')) closeParents();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) voice.pause();
});
window.addEventListener('storage', event => {
  if (event.key !== storageKey) return;
  completed = readShells();
  if (app.querySelector('.hero')) renderHome(false);
  else refreshShells();
});

renderHome(false);
refreshOffline();
