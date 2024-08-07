import episodes from 'the-office';
import { cleanLine, Search } from './search-utils';

const search = document.querySelector('[type="search"]');
const results = document.getElementById('results');
const episodeExplorer = document.getElementById('episode-explorer');
const searchObj = new Search();

// lets boot as many workers at there are cores, cycle through them on
// each new search
const searchWorkers = [];
if (window.Worker) {
  for (let i = 0; i < navigator?.hardwareConcurrency || 0; i++) {
    searchWorkers.push(new Worker('dist/search-worker.js'));
  }
}

let currentWorker = 0;
let searchTimeout = null;
const debounce = searchWorkers.length ? 50 : 1000;
function performSearch(value) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (searchWorkers.length) {
      searchWorkers[currentWorker].postMessage([performance.now(), value]);
      currentWorker = currentWorker < searchWorkers.length  - 1 ? currentWorker + 1 : 0;
    } else {
      showResults(searchObj.retrieveResults(value));
    }
  }, debounce);
}

function showResults(ids) {
  search.removeAttribute('disabled');

  results.innerHTML = '';
  if (ids?.length === 0) {
    const li = document.createElement('li');
    li.classList.add('no-results');
    li.innerHTML = 'No quotes found';
    results.appendChild(li);
    return;
  }

  const reg = new RegExp('\\b' + search.value.split(' ').map(x => cleanLine(x).split('').join('[^a-zA-Z0-9 ]?')).filter(x => !!x).join('|\\b'), 'gi');
  for (let i = 0; i < 100; i++) {
    const inter = ids[i];
    if (!inter) return;
    const [e, s, l] = inter.split('-');
    const episode = episodes[parseInt(e)]
    const line = episode.scenes[parseInt(s)][l];
    const quote = document.createElement('p');
    let adjusted = line.line.replace(reg, "|M|$&|M|");
    adjusted = adjusted.replaceAll("|M| |M|", " ");
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
    const wrapper = document.createElement('li');
    const link = document.createElement('a');
    link.setAttribute('href', '#episode-explorer');
    link.setAttribute('data-quote', inter);
    link.appendChild(quote);
    wrapper.appendChild(link);
    const info = document.createElement('span');
    info.innerHTML = `<strong>${line.character}</strong> in Season ${episode.season} Episode ${episode.episode} "${episode.title}"`;
    wrapper.appendChild(info);
    results.append(wrapper);
  };
}

search.addEventListener('input', event => {
  performSearch(event.target.value);
});

results.addEventListener('click', event => {
  const target = event.target;
  const quote = event.target.closest('[data-quote]');
  if (!quote) return;
  const [e, s, l] = quote.dataset.quote.split('-');
  const episode = episodes[parseInt(e)]
  const line = episode.scenes[parseInt(s)][l];
  const ul = document.createElement('ul');
  episode.scenes.forEach((scene, s) => {
    scene.forEach((line, l) => {
      const li = document.createElement('li');
      li.setAttribute('data-quote', `${e}-${s}-${l}`)
      const p = document.createElement('p');
      const sp = document.createElement('span');
      sp.innerHTML = line.line;
      p.appendChild(sp);
      li.appendChild(p);
      const c = document.createElement('span');
      c.classList.add('character');
      c.innerHTML = line.character;
      li.appendChild(c);
      ul.appendChild(li);
    });
  });
  episodeExplorer.innerHTML = '';
  const heading = document.createElement('h3');
  heading.innerHTML = `Season ${episode.season} Episode ${episode.episode} "${episode.title}"`;
  const close = document.createElement('button');
  close.innerHTML = 'Close Episode';
  episodeExplorer.appendChild(heading);
  episodeExplorer.appendChild(ul);
  episodeExplorer.appendChild(close);
  const interest = episodeExplorer.querySelector(`[data-quote="${quote.dataset.quote}"]`);
  interest.classList.add('selected-quote');
  episodeExplorer.scrollTop = interest.offsetTop - (episodeExplorer.offsetHeight/2) + (interest.offsetHeight/2);
});

episodeExplorer.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  episodeExplorer.innerHTML = '';
});

// theres gotta be a way to delegate this...
let lastUpdate = performance.now();
searchWorkers.forEach(worker => {
  worker.onmessage = e => {
    const [time, ids, data] = e.data;
    if (time < lastUpdate) return;
    lastUpdate = time;
    showResults(ids);
  };
});

// show on load
showResults(searchObj.retrieveResults(search.value));
