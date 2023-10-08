import {retrieveResults} from './search-utils';

onmessage = msg => {
  const [time, text] = msg.data;
  const start = performance.now()
  const results = utils.retrieveResults(text);
  postMessage([time, results, {
    time: performance.now() - start,
    length: results.length,
  }]);
}
