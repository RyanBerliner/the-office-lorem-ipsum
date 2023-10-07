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

// lets boot as many workers at there are cores, cycle through them on
// each new search
const searchWorkers = [];
if (window.Worker) {
  for (let i = 0; i < navigator.hardwareConcurrency; i++) {
    searchWorkers.push(new Worker('dist/search-worker.js'));
  }
}

let currentWorker = 0;
let searchTimeout = null;
const debounce = 50;
search.addEventListener('input', event => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchWorkers[currentWorker].postMessage([performance.now(), event.target.value]);
    currentWorker = currentWorker < searchWorkers.length  - 1 ? currentWorker + 1 : 0;
  }, debounce);
});

function cleanLine(line) {
  return line.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();
}

// theres gotta be a way to delegate this...
let lastUpdate = performance.now();
searchWorkers.forEach(worker => {
  worker.onmessage = e => {
    const [time, intersection, data] = e.data;
    if (time < lastUpdate) return;
    console.log(data);
    lastUpdate = time;
    let count = 0;
    results.innerHTML = '';
    const reg = new RegExp('(^|\\W)' + search.value.split(' ').map(x => cleanLine(x)).filter(x => !!x).join('|(^|\\W)'), 'gi');
    for (let i = 0; i < 10; i++) {
      const inter = intersection[i];
      if (!inter) return;
      const [e, s, l] = inter.split('-');
      const line = episodes[parseInt(e)].scenes[parseInt(s)][l];
      const quote = document.createElement('li');
      let adjusted = line.line.replace(reg, "|M|$&|M|");
      adjusted = adjusted.replaceAll("|M||M|", "");
      adjusted.split("|M|").forEach((part, i) => {
        let node;
        if (i % 2) {
          node = document.createElement('mark');
          node.innerHTML = part;
        } else {
          node = document.createTextNode(part);
        }
        quote.appendChild(node);
      });
      results.append(quote);
    };
  };
});
