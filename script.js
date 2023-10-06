import episodes from 'the-office';

const form = document.querySelector('form');
const search = document.querySelector('[type="search"]');
const results = document.getElementById('results');
const container = document.getElementById('output');

form.querySelector('button').removeAttribute('disabled');

function randomNumber(max) {
  return Math.floor(Math.random() * max);
}

function randomLine() {
  const episode = episodes[randomNumber(episodes.length)];
  const scene = episode.scenes[randomNumber(episode.scenes.length)];
  const line = scene[randomNumber(scene.length)];
  return {
    line: line.line,
    character: line.character,
    episode: {
      episode: episode.episode,
      title: episode.title,
      season: episode.season
    }
  };
}

form.addEventListener('submit', event => {
  event.preventDefault();

  // a 1 in 10 chance of just getting DWIGHT over and over
  const headInjury = randomNumber(10) === 0;

  const data = new FormData(form);
  const paragraphs = parseInt(data.get('paragraphs'));
  const linesPer = parseInt(data.get('linesPer')) * (headInjury ? 10 : 1);
  container.innerHTML = '';

  for (let i = 0; i < paragraphs; i++) {
    const p = document.createElement('p');
    if (i === 0 && headInjury) {
      p.appendChild(document.createTextNode('untitled folder '));
    }
    for (let o = 0; o < linesPer; o++) {
      p.appendChild(document.createTextNode((headInjury ? 'DWIGHT' : randomLine().line) + ' '));
    }
    container.appendChild(p);
  }
});

const lines = [];

function cleanLine(line) {
  return line.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();
}

episodes.forEach((episode, e) => {
  episode.scenes.forEach((scene, s) => {
    scene.forEach((line, l) => {
      lines.push({
        line: cleanLine(line.line),
        id: `${e}-${s}-${l}`
      });
    });
  });
});

const line = lines[0];

const trie = {'rec': [], 'desc': {}};

function ingest(word, id, triePart) {
  if (word.length === 0) return;
  const c = word[0];
  if (!triePart[c]) triePart[c] = {'rec': [], 'desc': {}};
  if (word.length === 1) triePart[c]['rec'].push(id);
  return ingest(word.substring(1), id, triePart[c]['desc'])
}

lines.forEach(line => {
  const words = new Set([...line.line.split(' ')]);
  words.forEach(word => {
    ingest(word, line.id, trie['desc']);
  });
});

search.addEventListener('input', event => {
  const cleaned = cleanLine(event.target.value);
  const words = new Set([...cleaned.split(' ').filter(word => !!word)]);
  if (!words) return;

  const lineIds = [];

  words.forEach(word => {
    let tree = trie;
    word.split('').forEach(c => {
      tree = tree?.['desc']?.[c];
    });
    lineIds.push(tree?.rec || []);
  });

  const intersection = lineIds.reduce((prev, curr) => {
    if (prev === false) return curr;
    return prev.filter(p => curr.includes(p));
  }, false);

  let count = 0;
  results.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const inter = intersection[i];
    if (!inter) return;
    const [e, s, l] = inter.split('-');
    const line = episodes[parseInt(e)].scenes[parseInt(s)][l];
    const quote = document.createElement('li');
    quote.innerText = line.line;
    results.append(quote);
  };
});
