import { guides, islands, scenes } from './lessons.js';
import { prepareOffline } from './offline.js';
import { createSpeechCapture } from './speech-capture.js';
import { prepareSpeech, recognizeSpeech } from './speech-engine.js';
import { scoreFollowAlong } from './speech-feedback.js';

const app = document.querySelector('#app');
const voice = document.querySelector('#voice');
const parents = document.querySelector('#parents');
const storageNote = document.querySelector('#storage-note');
const offlineBadge = document.querySelector('#offline-badge');
const storageKey = 'bubble-english-island.encounters.v2';
const legacyShells = 'bubble-english-island.shells.v1';
const speaker = '<span class="speaker-shape" aria-hidden="true"><i></i><b></b></span>';
const escape = value => String(value).replace(/[&<>"']/g, char => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));

let progress = loadProgress();
let session;
let activeVoice;
let lastDialogFocus;
const speechCapture = createSpeechCapture();

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return Object.fromEntries(scenes.flatMap(scene => {
      const value = raw?.[scene.id];
      if (!Number.isSafeInteger(value?.visits) || value.visits < 1 ||
          !/^\d{4}-\d{2}-\d{2}$/.test(value.lastPlayed)) return [];
      const firstResponses = Array.isArray(value.firstResponses)
        ? scene.ids.filter(id => value.firstResponses.includes(id)) : [];
      const speechStars = Object.fromEntries(scene.ids.flatMap(id => {
        const stars = value.speechStars?.[id];
        return Number.isInteger(stars) && stars >= 1 && stars <= 3 ? [[id, stars]] : [];
      }));
      return [[scene.id, { visits: value.visits, lastPlayed: value.lastPlayed, firstResponses, speechStars }]];
    }));
  } catch {
    storageNote.hidden = false;
    return {};
  }
}

function localDate() {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map(part => String(part).padStart(2, '0')).join('-');
}

function suggest(pool) {
  const due = pool.filter(scene => progress[scene.id]?.lastPlayed < localDate());
  due.sort((a, b) => progress[a.id].lastPlayed.localeCompare(progress[b.id].lastPlayed));
  // A new visit can also be replayed freely. Revisit earlier scenes on later days.
  return due[0] || pool.find(scene => !progress[scene.id]) || pool[0];
}

function saveVisit({ scene, firstResponses }) {
  const latest = loadProgress();
  const previous = latest[scene.id] || progress[scene.id];
  progress = { ...progress, ...latest, [scene.id]: {
    visits: (previous?.visits || 0) + 1,
    lastPlayed: localDate(),
    firstResponses: [...new Set([...(previous?.firstResponses || []), ...firstResponses])],
    speechStars: previous?.speechStars || {},
  } };
  saveProgress();
}

function saveSpeechStars(sceneId, lessonId, stars) {
  const latest = loadProgress();
  const previous = latest[sceneId] || progress[sceneId];
  if (!previous || (previous.speechStars[lessonId] || 0) >= stars) return;
  progress = { ...progress, ...latest, [sceneId]: {
    ...previous, speechStars: { ...previous.speechStars, [lessonId]: stars },
  } };
  saveProgress();
}

function saveProgress() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    storageNote.hidden = false;
  }
}

function updateParentNote() {
  const played = Object.keys(progress).length;
  const spoken = Object.values(progress).flatMap(visit => Object.values(visit.speechStars));
  document.querySelector('#family-progress').textContent =
    played ? `玩过 ${played} 个情境。可以换个地方、换样东西，再听听同一句。` : '选一个孩子熟悉的场景，从一两句开始。';
  document.querySelector('#family-stars').textContent = spoken.length
    ? `跟读过 ${spoken.length} 句，共收集 ${spoken.reduce((total, stars) => total + stars, 0)} 颗星。` : '';
  try {
    const old = JSON.parse(localStorage.getItem(legacyShells) || '[]');
    const count = Array.isArray(old) ? scenes.flatMap(scene => scene.ids).filter(id => old.includes(id)).length : 0;
    document.querySelector('#old-shells').textContent = count ? `上一版收集的贝壳仍保存在这里，共 ${count} 枚。` : '';
  } catch {}
}

function show(content, focus = true) {
  app.innerHTML = content;
  if (focus) {
    window.scrollTo(0, 0);
    app.querySelector('h1')?.focus({ preventScroll: true });
  }
}

function renderHome(focus = true) {
  cancelSpeech(false);
  stopVoice();
  session = undefined;
  const next = suggest(scenes);
  show(`
    <section class="hero">
      <div class="hero-copy">
        <p class="hero-greeting" lang="en">Come and play!</p>
        <h1 tabindex="-1">泡泡英语岛<span aria-hidden="true">.</span></h1>
        <p>听泡泡说，和它一起玩。</p>
        <button class="primary hero-start" data-action="start" data-island="${next.island.id}" data-scene="${next.id}">
          <span aria-hidden="true">▶</span> ${progress[next.id] ? '再去玩一会儿' : '和泡泡去玩'}
        </button>
      </div>
      <picture class="hero-picture"><img src="./art/island.webp" alt="海獭泡泡在小岛上等你" fetchpriority="high" width="900" height="600"></picture>
    </section>
    <section class="places" aria-labelledby="places-title">
      <div class="section-heading"><h2 id="places-title">想去哪里玩？</h2></div>
      <div class="island-grid">
        ${islands.map((island, index) => `
          <button class="island-card island-card-${index}" data-action="explore" data-island="${island.id}">
            <span class="island-emoji" aria-hidden="true">${island.emoji}</span>
            <span class="island-text"><strong>${island.title}</strong><span class="island-english" lang="en">${island.english}</span></span>
            <span class="island-arrow" aria-hidden="true">→</span>
          </button>`).join('')}
      </div>
    </section>`, focus);
}

function explore(island) {
  if (!island) return;
  show(`
    <div class="trip-top"><button class="secondary" data-action="home">← 回小岛</button></div>
    <section class="practice explore-view">
      <h1 tabindex="-1">${island.title}</h1>
      <div class="scene-menu">${scenes.filter(scene => scene.island === island).map(scene => `
        <button class="scene-card" data-action="start" data-island="${island.id}" data-scene="${scene.id}">
          <span aria-hidden="true">${scene.lessons[0].emoji}</span><strong>${scene.name}</strong>
          <span aria-hidden="true">▶</span>
        </button>`).join('')}</div>
    </section>`);
}

function randomBit() {
  return Math.random() < .5 ? 0 : 1;
}

function startScene(scene) {
  if (!scene) return;
  stopVoice();
  const previous = progress[scene.id];
  session = {
    scene, phase: 'model', modelIndex: 0, modeled: false, trialNum: 0,
    firstResponses: new Set(), feedback: '', attempt: null,
    visit: previous?.visits || 0,
  };
  if (previous?.lastPlayed < localDate()) beginTrial();
  renderLesson();
}

function beginTrial() {
  const { scene, visit, trialNum } = session;
  const target = scene.lessons[randomBit()];
  const order = randomBit() ? [...scene.lessons].reverse() : scene.lessons;
  session.attempt = {
    target, order, heard: false, supported: false, mistakes: 0, reveal: false, result: '',
    variant: (visit + trialNum) % 2,
  };
  session.trialNum++;
  session.phase = 'act';
  session.feedback = '';
}

function currentLesson(s) {
  return s.phase === 'act' ? s.attempt.target : s.scene.lessons[s.modelIndex];
}

function propArt(lesson, variant) {
  const { prop } = lesson;
  if (prop.art) return `<span class="drink drink-${prop.art} drink-${variant}" aria-hidden="true"><i></i></span>`;
  return `<span class="prop-symbol" aria-hidden="true">${prop.symbols[variant]}</span>`;
}

function actionBoard({ attempt, scene }) {
  const { target, order, variant, reveal, result } = attempt;
  const location = scene.locations[variant];
  return `<div class="action-board world-${scene.island.id} world-${variant}${result ? ' has-outcome' : ''}" aria-label="${location}">
    <span class="world-location">${location}</span>
    <div class="world-backdrop" aria-hidden="true"></div>
    <img class="world-buddy" src="./art/apple-touch-icon.png" width="106" height="106" alt="">
    ${scene.id === 'catch' ? '<span class="scene-ball" aria-hidden="true">⚽</span>' : ''}
    <div class="props">
      ${order.map(lesson => {
        const right = lesson === target;
        return `<button class="prop-button${right && reveal ? ' suggested' : ''}${right && result ? ' enacted' : ''}" data-action="prop"
          data-prop="${lesson.id}" aria-label="${lesson.prop.label}" ${attempt.heard && !result ? '' : 'disabled'}>
          ${propArt(lesson, variant)}
        </button>`;
      }).join('')}
    </div>
    ${result ? `<p class="world-outcome" data-outcome="${result}" role="status">${target.prop.outcome}</p>` : ''}
  </div>`;
}

function renderLesson(focus = true) {
  const s = session;
  if (s.phase === 'speak') return renderSpeech(focus);
  const { scene, phase, attempt } = s;
  const lesson = currentLesson(s);
  const title = phase === 'model' ? '听泡泡说' : '来帮帮泡泡';
  const description = {
    model: '听一听，看看发生了什么。',
    act: '听完英语，再动手。',
  }[phase];
  const visual = phase === 'act' ? actionBoard(s) : phase === 'model'
    ? `<figure class="demo${s.modeled ? ' demonstrated' : ''}" data-demonstration>
         <img src="${lesson.picture}" width="600" height="400" alt="${escape(lesson.chinese)}">
         ${s.modeled ? `<figcaption>${lesson.prop.outcome}</figcaption>` : ''}
       </figure>` : '';
  const ready = phase === 'model' ? s.modeled : !!attempt.result;
  const next = phase === 'model' ? s.modelIndex === 0 ? '再听一句' : '我来帮忙'
    : s.trialNum < 2 ? '再帮一次' : '轮到我啦';
  show(`
    <div class="trip-top">
      <button class="secondary" data-action="home">← 回小岛</button>
      <span class="location"><span aria-hidden="true">${scene.island.emoji}</span> ${scene.name}</span>
    </div>
    <section class="practice listening-game" data-phase="${phase}">
      <h1 tabindex="-1">${title}</h1>
      <p class="step-description">${description}</p>
      <div class="speaking-tools">
        <button class="listen-button" data-action="listen" aria-label="听英语" aria-pressed="false">
          ${speaker}<strong class="play-caption">听英语</strong>
        </button>
        <button class="guide-button" data-action="help" aria-label="${phase === 'act' ? '需要帮忙，听中文提示' : '听中文提示'}">? <span>听提示</span></button>
      </div>
      ${visual}
      <p class="feedback" role="status" id="feedback">${s.feedback}</p>
      <button class="primary next-button" data-action="continue" ${ready ? '' : 'disabled'}>${next} →</button>
    </section>`, focus);
  syncVoiceControls();
}

const microphone = '<span class="mic-icon" aria-hidden="true"><i></i></span>';

function renderSpeech(focus = false) {
  const { speech, scene } = session;
  const lesson = currentLesson(session);
  const { stage, score, practice, message } = speech;
  const busy = ['permission', 'demo', 'recording', 'checking', 'replay'].includes(stage);
  const alternate = scene.lessons[1 - session.modelIndex];
  const nextLabel = practice.has(alternate.id) ? '换回另一句' : '下一句';
  const leadWithNext = score?.stars === 3 && !practice.has(alternate.id) && !busy;
  const titles = {
    ready: '和泡泡跟一句', permission: '打开麦克风', demo: '先听泡泡说',
    recording: '轮到你说啦', checking: '泡泡在想一想', result: score?.stars ? '泡泡听到啦' : '我们再说一次',
    unavailable: '先听泡泡说', replay: '听泡泡说',
  };
  const descriptions = {
    ready: '泡泡先说一遍，麦克风亮了就跟着说。', permission: '请家长帮忙允许麦克风。',
    demo: '听完这一句，再轮到你。', recording: '说完停一停，泡泡会给你星星。',
    checking: '马上就好。', result: score?.message || '再听一遍，跟着泡泡试试。',
    unavailable: '你可以听示范，自己跟着说。', replay: '等泡泡说完，你也可以说一遍。',
  };
  const stars = score?.stars > 0 ? `<div class="speech-stars" aria-label="获得 ${score.stars} 颗星，共 3 颗">
    ${[1, 2, 3].map(level => `<span class="${level <= score.stars ? 'earned' : ''}" aria-hidden="true">★</span>`).join('')}
  </div>` : '';
  const primary = stage === 'unavailable'
    ? `<button class="primary speech-cta" data-action="speech-demo">${speaker} 听英语</button>`
    : busy ? '' : leadWithNext ? '<button class="primary speech-cta" data-action="speech-next">下一句 →</button>'
      : `<button class="primary speech-cta" data-action="speech-start">${microphone}
         ${score || message ? '再听一遍，跟着说' : '听一句，跟一句'}</button>`;
  const next = !busy && (practice.has(lesson.id) || stage === 'unavailable');
  const showStatus = busy ? `<span class="speech-signal" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>` : '';
  show(`
    <div class="trip-top speech-top">
      <button class="quiet-button" data-action="home">← 回小岛</button>
      <span class="location"><span aria-hidden="true">${scene.island.emoji}</span> ${scene.name}</span>
    </div>
    <section class="practice speech-practice" data-phase="speak" data-speech-stage="${stage}">
      <div class="speech-stage">
        <div class="bubble-companion" aria-hidden="true"><img src="./art/apple-touch-icon.png" width="104" height="104" alt=""></div>
        <div class="speech-status" aria-live="polite">
          <h1 tabindex="-1">${titles[stage]}</h1>
          <p>${escape(message || descriptions[stage])}</p>
        </div>
        <p class="speak-text" lang="en">${escape(lesson.english)}</p>
        ${stage === 'recording' ? `<span class="recording-mark" aria-hidden="true">${microphone}</span>` : ''}
        ${showStatus}${stars}${primary}
      </div>
      <div class="speech-extras">
        ${!busy && stage !== 'unavailable' ? '<button class="quiet-button" data-action="speech-demo">只听示范</button>' : ''}
        ${stage === 'unavailable' ? '<button class="quiet-button" data-action="speech-start">重试麦克风</button>' : ''}
        ${next && !leadWithNext ? `<button class="quiet-button speech-next" data-action="speech-next">${nextLabel} →</button>` : ''}
        ${leadWithNext ? '<button class="quiet-button" data-action="speech-start">再练这句</button>' : ''}
        ${practice.size === scene.lessons.length && !busy ? '<button class="quiet-button" data-action="parents">在家接着玩</button>' : ''}
      </div>
    </section>`, focus);
}

function setSpeechStage(stage, message = '') {
  Object.assign(session.speech, { stage, message });
  renderSpeech(stage === 'result');
}

function cancelSpeech(render = true) {
  if (session?.phase !== 'speak') return;
  const { speech } = session;
  speech.task?.abort();
  speech.task = null;
  speechCapture.release();
  if (!['ready', 'result', 'unavailable'].includes(speech.stage)) {
    Object.assign(speech, { stage: speech.score ? 'result' : 'ready', message: '' });
    if (render) renderSpeech();
  }
}

async function startFollowAlong() {
  const s = session;
  if (s?.phase !== 'speak' || !['ready', 'result', 'unavailable'].includes(s.speech.stage)) return;
  if (offlineBadge.dataset.state !== 'ready') {
    setSpeechStage('ready', '离线评分包还在准备，可以先听示范。');
    return;
  }
  const { speech } = s;
  const lesson = currentLesson(s);
  const task = new AbortController();
  speech.task = task;
  speech.score = null;
  const valid = () => session === s && speech.task === task && !task.signal.aborted;
  if (!speechCapture.prepared) {
    setSpeechStage('permission');
    try {
      await speechCapture.prepare();
      if (!valid()) return;
    } catch (error) {
      if (valid()) {
        cancelSpeech(false);
        setSpeechStage('unavailable', error.code === 'permission'
          ? '麦克风还没打开，请家长帮忙检查浏览器权限。'
          : '这台设备暂时打不开麦克风。');
      }
      return;
    }
  }

  const engine = prepareSpeech({ signal: task.signal }).then(() => true, () => false);
  setSpeechStage('demo');
  void playVoice(lesson.audio, 'speech-demo', async () => {
    if (!valid()) return;
    setSpeechStage('recording');
    try {
      const samples = await speechCapture.listen({ signal: task.signal });
      if (!valid()) return;
      speechCapture.release();
      setSpeechStage('checking');
      if (!await engine) throw new Error('Speech model unavailable');
      if (!valid()) return;
      const transcript = await recognizeSpeech(samples, { signal: task.signal });
      if (!valid()) return;
      speech.score = scoreFollowAlong(transcript, lesson.english);
      if (speech.score.stars > 0) {
        speech.practice.add(lesson.id);
        saveSpeechStars(s.scene.id, lesson.id, speech.score.stars);
      }
      setSpeechStage('result');
    } catch (error) {
      if (valid()) setSpeechStage('ready', error.code === 'no-speech'
        ? '泡泡还没听到声音。再试一次，等麦克风亮了再说。'
        : '评分暂时没准备好，请稍后再跟读。');
    } finally {
      if (valid()) {
        speech.task = null;
        speechCapture.release();
      }
    }
  }, () => {
    if (!valid()) return;
    speech.task = null;
    setSpeechStage('ready', '再点一次，就能播放示范。');
  });
}

function replaySpeech() {
  const s = session;
  if (s?.phase !== 'speak' || !['ready', 'result', 'unavailable'].includes(s.speech.stage)) return;
  const { stage, message } = s.speech;
  const finish = () => { if (s === session) setSpeechStage(stage, message); };
  setSpeechStage('replay');
  void playVoice(currentLesson(s).audio, 'speech-demo', finish, finish);
}

function nextSpeechPhrase() {
  const s = session;
  if (s?.phase !== 'speak' || !['ready', 'result', 'unavailable'].includes(s.speech.stage)) return;
  if (!s.speech.practice.has(currentLesson(s).id) && s.speech.stage !== 'unavailable') return;
  const stage = s.speech.stage === 'unavailable' ? 'unavailable' : 'ready';
  cancelSpeech(false);
  s.modelIndex = 1 - s.modelIndex;
  s.speech.score = null;
  setSpeechStage(stage);
}

function syncVoiceControls() {
  for (const button of parents.querySelectorAll('[data-action="family-listen"]')) {
    button.setAttribute('aria-pressed', String(activeVoice?.kind === 'family' && activeVoice.src === button.dataset.src));
  }
  const listen = app.querySelector('[data-action="listen"]');
  if (!listen) return;
  const speaking = activeVoice?.kind === 'english';
  listen.setAttribute('aria-pressed', String(speaking));
  listen.setAttribute('aria-label', speaking ? '重新播放英语' : '听英语');
  listen.querySelector('.play-caption').textContent = speaking ? '正在说' : '听英语';
  const help = app.querySelector('[data-action="help"]');
  help.setAttribute('aria-pressed', String(activeVoice?.kind === 'chinese'));
  const attempt = session?.phase === 'act' && session.attempt;
  if (attempt) for (const prop of app.querySelectorAll('[data-action="prop"]')) {
    prop.disabled = !attempt.heard || !!activeVoice || !!attempt.result;
  }
  if (session.phase === 'model' && session.modeled && activeVoice) {
    app.querySelector('[data-action="continue"]').disabled = true;
  } else if (session.phase === 'model' && session.modeled) {
    app.querySelector('[data-action="continue"]').disabled = false;
  }
}

function stopVoice() {
  activeVoice = undefined;
  voice.onended = voice.onpause = voice.onerror = null;
  voice.pause();
}

async function playVoice(src, kind, after, interrupted) {
  const s = session;
  stopVoice();
  const playback = { kind, src };
  activeVoice = playback;
  voice.src = src;
  syncVoiceControls();
  function finish(ended, showError = false) {
    if (activeVoice !== playback || session !== s) return;
    stopVoice();
    if (showError && kind === 'family') document.querySelector('#family-audio-state').textContent = '声音没播出来，再点一下试试。';
    else if (showError && s && kind !== 'speech-demo') setFeedback('声音没播出来，再点一下试试。');
    syncVoiceControls();
    if (ended) after?.();
    else interrupted?.();
  }
  voice.onended = () => finish(true);
  voice.onerror = () => finish(false, true);
  voice.onpause = () => { if (voice.paused && !voice.ended) finish(false); };
  try {
    await voice.play();
  } catch (error) {
    finish(false, error.name !== 'AbortError');
  }
}

function setFeedback(message) {
  session.feedback = message;
  app.querySelector('#feedback').textContent = message;
}

function listen() {
  const s = session;
  const lesson = currentLesson(s);
  setFeedback('');
  return playVoice(lesson.audio, 'english', () => {
    if (s.phase === 'model' && !s.modeled) {
      s.modeled = true;
      renderLesson(false);
      app.querySelector('[data-action="continue"]').focus({ preventScroll: true });
    }
    if (s.phase === 'act' && !s.attempt.result) {
      s.attempt.heard = true;
      setFeedback('现在可以动手啦。');
      syncVoiceControls();
    }
  });
}

function help() {
  const s = session;
  const lesson = currentLesson(s);
  if (s.phase === 'act' && !s.attempt.result) {
    if (!s.attempt.heard && !s.attempt.mistakes) return playVoice(guides.choose, 'chinese');
    s.attempt.supported = true;
    s.attempt.reveal = true;
    setFeedback(lesson.chinese);
    renderLesson(false);
    return playVoice(lesson.hint, 'chinese');
  }
  if (s.phase === 'model') {
    if (!s.modeled) return playVoice(guides.listen, 'chinese');
    setFeedback(lesson.chinese);
    return playVoice(lesson.hint, 'chinese');
  }
  return playVoice(guides.speak, 'chinese');
}

function enact(id) {
  if (session?.phase !== 'act') return;
  const { attempt } = session;
  if (!attempt.heard || activeVoice || attempt.result || !attempt.order.some(lesson => lesson.id === id)) return;
  if (id !== attempt.target.id) {
    attempt.mistakes++;
    if (attempt.mistakes === 2) {
      finishAction('supported');
      void playVoice(attempt.target.hint, 'chinese');
      return;
    }
    attempt.heard = false;
    setFeedback('再听一听，也可以点提示。');
    syncVoiceControls();
    app.querySelector('[data-action="listen"]').focus({ preventScroll: true });
    return;
  }
  finishAction(attempt.supported || attempt.mistakes ? 'supported' : 'independent');
}

function finishAction(result) {
  const { attempt } = session;
  attempt.result = result;
  if (result === 'independent') session.firstResponses.add(attempt.target.id);
  session.lastTarget = attempt.target;
  session.feedback = '';
  renderLesson(false);
  app.querySelector('[data-action="continue"]').focus({ preventScroll: true });
}

function continueLesson() {
  const s = session;
  if (!s) return;
  if (s.phase === 'model') {
    if (!s.modeled || activeVoice) return;
    if (s.modelIndex === 0) {
      s.modelIndex = 1;
      s.modeled = false;
      s.feedback = '';
    } else beginTrial();
  } else if (s.phase === 'act') {
    if (!s.attempt.result) return;
    if (s.trialNum < 2) beginTrial();
    else {
      saveVisit(s);
      s.phase = 'speak';
      s.modelIndex = s.scene.lessons.indexOf(s.lastTarget);
      s.speech = { stage: 'ready', score: null, message: '', practice: new Set(), task: null };
    }
  } else return;
  stopVoice();
  renderLesson();
}

function openParents(scene = session?.scene) {
  if (parents.hasAttribute('open')) return;
  cancelSpeech();
  stopVoice();
  updateParentNote();
  const familyScene = scene || scenes[0];
  document.querySelector('#home-activity').textContent = familyScene.atHome;
  document.querySelector('#family-voices').innerHTML = familyScene.lessons.map(lesson =>
    `<button class="secondary" data-action="family-listen" data-src="${lesson.audio}" aria-pressed="false">
      <span aria-hidden="true">▶</span> <span lang="en">${escape(lesson.english)}</span></button>`
  ).join('') + '<p id="family-audio-state" role="status"></p>';
  syncVoiceControls();
  lastDialogFocus = document.activeElement;
  if (typeof parents.showModal === 'function') parents.showModal();
  else {
    parents.setAttribute('open', '');
    document.body.classList.add('legacy-modal');
  }
  parents.querySelector('.close-dialog').focus();
}

function closeParents() {
  stopVoice();
  syncVoiceControls();
  if (typeof parents.close === 'function') parents.close();
  else {
    parents.removeAttribute('open');
    document.body.classList.remove('legacy-modal');
  }
  lastDialogFocus?.focus();
}

async function refreshOffline() {
  const badge = offlineBadge;
  const label = badge.querySelector('strong');
  const detail = document.querySelector('#offline-detail');
  const retry = document.querySelector('#offline-retry');
  badge.dataset.state = 'loading';
  label.textContent = '正在准备离线包';
  detail.textContent = '首次准备约 49 MB，包含语音评分，请保持当前页面打开。';
  retry.hidden = true;
  try {
    await prepareOffline();
    badge.dataset.state = 'ready';
    label.textContent = '离线已就绪';
    detail.textContent = '练习、声音和跟读评分都可以断网使用。';
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
    case 'explore': explore(islands.find(island => island.id === button.dataset.island)); break;
    case 'start': startScene(scenes.find(scene => scene.id === button.dataset.scene)); break;
    case 'listen': void listen(); break;
    case 'help': void help(); break;
    case 'prop': enact(button.dataset.prop); break;
    case 'continue': continueLesson(); break;
    case 'speech-start': void startFollowAlong(); break;
    case 'speech-demo': replaySpeech(); break;
    case 'speech-next': nextSpeechPhrase(); break;
    case 'parents': openParents(scenes.find(scene => scene.id === button.dataset.scene)); break;
    case 'family-listen':
      if (session?.phase === 'act' && !session.attempt.result) session.attempt.supported = true;
      document.querySelector('#family-audio-state').textContent = '';
      void playVoice(button.dataset.src, 'family');
      break;
    case 'close-parents': closeParents(); break;
    case 'retry-offline': void refreshOffline(); break;
  }
});
parents.addEventListener('close', () => {
  if (activeVoice?.kind === 'family') {
    stopVoice();
    syncVoiceControls();
  }
  lastDialogFocus?.focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('legacy-modal')) closeParents();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelSpeech();
    stopVoice();
    syncVoiceControls();
  }
});
window.addEventListener('pagehide', () => {
  cancelSpeech(false);
  stopVoice();
});
window.addEventListener('storage', event => {
  if (event.key === storageKey) progress = loadProgress();
  if (parents.open) updateParentNote();
});

renderHome(false);
void refreshOffline();
