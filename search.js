import episodes from 'the-office';
import { cleanLine, Search } from './search-utils';
import $ from './base';

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

  if (ids === false) {
    results.innerHTML = '';
    return;
  }

  if (ids?.length === 0) {
    results.replaceChildren($('li', ['No quotes found']));
    return;
  }

  const reg = new RegExp('\\b' + search.value.split(' ').map(x => cleanLine(x).split('').join('[^a-zA-Z0-9 ]?')).filter(x => !!x).join('|\\b'), 'gi');

  results.replaceChildren(...ids.slice(0, 100).map(inter => {
    const [e, s, l] = inter.split('-');
    const episode = episodes[parseInt(e)]
    const line = episode.scenes[parseInt(s)][l];
    let adjusted = line.line.replace(reg, "|M|$&|M|");
    adjusted = adjusted.replaceAll("|M| |M|", " ");

    const link = $('a', [
      $('p', adjusted.split("|M|").map((part, i) => {
        return (i % 2) ? $('mark', [part]) : part;
      }))
    ]);

    link.setAttribute('href', '#episode-explorer');
    link.setAttribute('data-quote', inter);

    return $('li', [
      link,
      $('span', [
        $('strong', [line.character]),
        ` in Season ${episode.season} Episode ${episode.episode} "${episode.title}"`
      ]),
    ]);
  }));
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

  episodeExplorer.replaceChildren(
    $('h3', [`Season ${episode.season} Episode ${episode.episode} "${episode.title}"`]),
    $('ul', episode.scenes.map((scene, s) => {
      return scene.map((line, l) => {
        const li = $('li', [
          $('p', [$('span', [line.line])]),
          $('span.character', [line.character]),
        ]);

        li.setAttribute('data-quote', `${e}-${s}-${l}`)

        return li;
      });
    }).flat()),
    $('button', ['Close Episode']),
  );

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
