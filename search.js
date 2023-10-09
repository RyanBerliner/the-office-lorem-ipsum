import episodes from 'the-office';
import { cleanLine, Search } from './search-utils';

const search = document.querySelector('[type="search"]');
const results = document.getElementById('results');
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
    wrapper.appendChild(quote);
    const info = document.createElement('span');
    info.innerHTML = `<strong>${line.character}</strong> in Season ${episode.season} Episode ${episode.episode} "${episode.title}"`;
    wrapper.appendChild(info);
    results.append(wrapper);
  };
}

search.addEventListener('input', event => {
  performSearch(event.target.value);
});

// theres gotta be a way to delegate this...
let lastUpdate = performance.now();
searchWorkers.forEach(worker => {
  worker.onmessage = e => {
    const [time, ids, data] = e.data;
    if (time < lastUpdate) return;
    // console.log(data);
    lastUpdate = time;
    showResults(ids);
  };
});

// show on load
showResults(searchObj.retrieveResults(search.value));
