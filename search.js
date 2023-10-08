import episodes from 'the-office';
import { cleanLine, retrieveResults } from './search-utils';

const search = document.querySelector('[type="search"]');
const results = document.getElementById('results');

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
const debounce = searchWorkers.length ? 50 : 1000;
function performSearch(value) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (searchWorkers.length) {
      searchWorkers[currentWorker].postMessage([performance.now(), value]);
      currentWorker = currentWorker < searchWorkers.length  - 1 ? currentWorker + 1 : 0;
    } else {
      showResults(retrieveResults(value));
    }
  }, debounce);
}

function showResults(ids) {
  results.innerHTML = '';
  const reg = new RegExp('\\b' + search.value.split(' ').map(x => cleanLine(x).split('').join('[^a-zA-Z0-9 ]?')).filter(x => !!x).join('|\\b'), 'gi');
  for (let i = 0; i < 100; i++) {
    const inter = ids[i];
    if (!inter) return;
    const [e, s, l] = inter.split('-');
    const line = episodes[parseInt(e)].scenes[parseInt(s)][l];
    const quote = document.createElement('li');
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
    results.append(quote);
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

// on load
performSearch(search.value);
