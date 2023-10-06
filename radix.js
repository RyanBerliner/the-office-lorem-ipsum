const episodes = require('the-office');

const lines = [];

episodes.forEach((episode, e) => {
  episode.scenes.forEach((scene, s) => {
    scene.forEach((line, l) => {
      lines.push({
        line: line.line.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase(),
        id: `${e}-${s}-${l}`
      });
    });
  });
});

const line = lines[0];

const trie = {};

function ingest(word, id, triePart) {
  if (word.length === 0) return;
  const c = word[0];
  if (!triePart[c]) triePart[c] = {'rec': [], 'desc': {}};
  if (word.length === 1) triePart[c]['rec'].push(id);
  return ingest(word.substring(1), id, triePart[c]['desc'])
}

lines.forEach(line => {
  const words = line.line.split(' ');
  words.forEach(word => {
    ingest(word, line.id, trie);
  });
});

console.log(JSON.stringify(trie));
