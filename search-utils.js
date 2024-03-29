import episodes from 'the-office';

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

class Search {
  constructor() {
    this._lines = [];
    this._trie = null;
  }

  get lines() {
    if (this._lines.length) return this.lines;
    episodes.forEach((episode, e) => {
      episode.scenes.forEach((scene, s) => {
        scene.forEach((line, l) => {
          this._lines.push({
            line: cleanLine(line.line),
            id: `${e}-${s}-${l}`
          });
        });
      });
    });
    return this._lines;
  }

  get trie() {
    if (this._trie) return this._trie;
    this._trie = {'rec': [], 'desc': {}};
    this.lines.forEach(line => {
      const words = new Set([...line.line.split(' ')]);
      words.forEach(word => {
        this._ingest(word, line.id, this._trie['desc']);
      });
    });
    return this._trie;
  }

  retrieveResults(text) {
    const cleaned = cleanLine(text);
    const words = new Set([...cleaned.split(' ').filter(word => !!word)]);
    if (!words) return;

    const lineIds = [];

    words.forEach(word => {
      let trie = this.trie;
      word.split('').forEach(c => {
        trie = trie?.['desc']?.[c];
      });
      lineIds.push(this._retrieveAll(trie).sort(compareIds));
    });

    // lets sort by the most exclusive term first
    lineIds.sort((a, b) => a.length < b.length ? -1 : a.length > b.length ? 1 : 0);

    const intersection = lineIds.reduce((prev, curr) => {
      if (prev === false) return Array.from(new Set(curr));
      return idIntersection(prev, curr);
    }, false);

    // lets assume short quotes are a closer match
    (intersection || []).sort((a, b) => {
      const [ae, as, al] = a.split('-').map(x => parseInt(x));
      const [be, bs, bl] = b.split('-').map(x => parseInt(x));
      const linea = episodes[ae].scenes[as][al].line;
      const lineb = episodes[be].scenes[bs][bl].line;
      return linea.length < lineb.length ? -1 : linea.length > lineb.length ? 1 : 0;
    });

    return intersection;
  }

  _ingest(word, id, triePart) {
    if (word.length === 0) return;
    const c = word[0];
    if (!triePart[c]) triePart[c] = {'rec': [], 'desc': {}};
    if (word.length === 1) triePart[c]['rec'].push(id);
    return this._ingest(word.substring(1), id, triePart[c]['desc'])
  }

  _retrieveAll(triePart) {
    const direct = triePart?.rec || [];
    const children = [];
    Object.keys(triePart?.desc || {}).forEach(key => {
      if (key === 'rec') return;
      children.push(...this._retrieveAll(triePart.desc[key]));
    });
    return [...direct, ...children];
  }
}

export { cleanLine, Search };
