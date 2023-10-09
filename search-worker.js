import {Search} from './search-utils';

const search = new Search();
search.trie; // create the trie now so its ready

onmessage = msg => {
  const [time, text] = msg.data;
  const start = performance.now()
  const results = search.retrieveResults(text);
  postMessage([time, results, {
    time: performance.now() - start,
    length: results.length,
  }]);
}
