const contractions = new Map([
  ["i'm", 'i am'],
  ["it's", 'it is'], ['its', 'it is'],
  ["let's", 'let us'], ['lets', 'let us'],
  ["that's", 'that is'],
  ["we're", 'we are'],
  ["you're", 'you are'],
  ["can't", 'can not'], ['cant', 'can not'],
  ["don't", 'do not'], ['dont', 'do not'],
  ["doesn't", 'does not'], ['doesnt', 'does not'],
  ["isn't", 'is not'], ['isnt', 'is not'],
  ["won't", 'will not'], ['wont', 'will not'],
]);

const wordVariants = new Map([
  ['apples', 'apple'],
  ['balls', 'ball'],
  ['birds', 'bird'],
  ['books', 'book'],
  ['boxes', 'box'],
  ['cats', 'cat'],
  ['dogs', 'dog'],
  ['raining', 'rain'],
  ['towers', 'tower'],
]);

const functionWords = new Set([
  'a', 'am', 'an', 'and', 'are', 'at', 'be', 'can', 'could', 'do', 'does',
  'for', 'from', 'have', 'he', 'i', 'in', 'is', 'it', 'let', 'may', 'me',
  'my', 'of', 'on', 'or', 'please', 'she', 'some', 'that', 'the', 'them',
  'they', 'this', 'to', 'us', 'was', 'we', 'were', 'will', 'with', 'you', 'your',
]);
const hesitations = new Set(['ah', 'er', 'erm', 'hmm', 'uh', 'um']);
const negatives = new Set(['not', 'never']);

const messages = [
  '泡泡没听清。再听一遍，慢慢跟着说。',
  '泡泡听到句子里的词啦！试着连起来说。',
  '泡泡听到一小段啦！再试着说一整句。',
  '泡泡听到整句啦！',
];

function words(value) {
  if (typeof value !== 'string') return [];
  const normalized = value.normalize('NFKC').toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\[[^\]]*\]|\([^)]*\)|<[^>]*>/g, ' ');
  const tokens = normalized.match(/[a-z]+(?:'[a-z]+)*/g) ?? [];
  return tokens.filter(token => !hesitations.has(token))
    .flatMap(token => (contractions.get(token) ?? token).split(' '));
}

function wordRoot(word) {
  return wordVariants.get(word) ?? word;
}

function orderedMatchCount(heard, target) {
  let previous = Array(target.length + 1).fill(0);
  for (const heardWord of heard) {
    const current = [0];
    for (const [index, targetWord] of target.entries()) {
      const count = heardWord === targetWord
        ? previous[index] + 1
        : Math.max(current[index], previous[index + 1]);
      current.push(count);
    }
    previous = current;
  }
  return previous[target.length];
}

function feedback(stars) {
  return { stars, message: messages[stars] };
}

// Stars reflect how much of the lesson phrase appeared in the local transcript.
export function scoreFollowAlong(transcript, expectedEnglish) {
  const heard = words(transcript);
  const target = words(expectedEnglish);
  if (!heard.length || !target.length) return feedback(0);
  if (heard.some(word => negatives.has(word) && !target.includes(word))) return feedback(0);
  if (heard.length === target.length && heard.every((word, index) => word === target[index])) {
    return feedback(3);
  }

  const heardRoots = heard.map(wordRoot);
  const targetRoots = target.map(wordRoot);
  const matchedWords = [...new Set(heardRoots.filter(word => targetRoots.includes(word)))];
  const matchedContentWords = matchedWords.filter(word => !functionWords.has(word));
  if (!matchedContentWords.length || matchedWords.length * 2 < new Set(heardRoots).size) {
    return feedback(0);
  }

  const ordered = orderedMatchCount(heardRoots, targetRoots);
  const clearFragment = ordered === heardRoots.length && matchedContentWords.length >= 2;
  const coversMostOfPhrase = ordered >= 2 && ordered * 5 >= targetRoots.length * 3;
  const hasFewExtraWords = ordered * 3 >= heardRoots.length * 2;
  const reachesLastWord = heardRoots.at(-1) === targetRoots.at(-1);
  if (clearFragment || (coversMostOfPhrase && hasFewExtraWords && (ordered === heardRoots.length || reachesLastWord))) {
    return feedback(2);
  }
  return feedback(1);
}
