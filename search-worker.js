import episodes from 'the-office';

const lines = [];

function cleanLine(line) {
  return line.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();
}

function compareIds(a, b) {
  const [ae, as, al] = a.split('-').map(x => parseInt(x));
  const [be, bs, bl] = b.split('-').map(x => parseInt(x));
  if (ae < be) return -1;
  if (be < ae) return 1;
  if (as < bs) return -1;
  if (bs < as) return 1;
  if (al < bl) return -1;
  if (bl < al) return 1;
  return 0;
}

function idIntersection(a, b) {
  let ai = 0;
  let bi = 0;
  const inter = [];
  while (ai < a.length && bi < b.length) {
    const comp = compareIds(a[ai], b[bi]);
    if (comp === 0) {
      inter.push(a[ai]);
      ai++;
      bi++;
    } else if (comp > 0) { bi++; } else { ai++; }
  }
  return inter;
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

const trie = {'rec': [], 'desc': {}};

function ingest(word, id, triePart) {
  if (word.length === 0) return;
  const c = word[0];
  if (!triePart[c]) triePart[c] = {'rec': [], 'desc': {}};
  if (word.length === 1) triePart[c]['rec'].push(id);
  return ingest(word.substring(1), id, triePart[c]['desc'])
}

function retrieveAll(tree) {
  const direct = tree?.rec || [];
  const children = [];
  Object.keys(tree?.desc || {}).forEach(key => {
    if (key === 'rec') return;
    children.push(...retrieveAll(tree.desc[key]));
  });
  return [...direct, ...children];
}

lines.forEach(line => {
  const words = new Set([...line.line.split(' ')]);
  words.forEach(word => {
    ingest(word, line.id, trie['desc']);
  });
});

onmessage = msg => {
  const [time, text] = msg.data;
  const start = performance.now()
  const cleaned = cleanLine(text);
  const words = new Set([...cleaned.split(' ').filter(word => !!word)]);
  if (!words) return;

  const lineIds = [];

  words.forEach(word => {
    let tree = trie;
    word.split('').forEach(c => {
      tree = tree?.['desc']?.[c];
    });
    lineIds.push(retrieveAll(tree).sort(compareIds));
  });

  // lets sort by the most exclusive term first
  lineIds.sort((a, b) => a.length < b.length ? -1 : a.length > b.length ? 1 : 0);

  const intersection = lineIds.reduce((prev, curr) => {
    if (prev === false) return curr;
    return idIntersection(prev, curr);
  }, false);

  postMessage([time, intersection, {
    time: performance.now() - start,
    length: intersection.length,
  }]);
}
