import episodes from 'the-office';

const form = document.querySelector('form');
const container = document.getElementById('output');

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
  const data = new FormData(form);
  const paragraphs = parseInt(data.get('paragraphs'));
  const linesPer = parseInt(data.get('linesPer'));
  container.innerHTML = '';

  // a 1 in 10 chance of just getting DWIGHT over and over
  const headInjury = randomNumber(10) === 0;

  for (let i = 0; i < paragraphs; i++) {
    const p = document.createElement('p');
    for (let o = 0; o < (headInjury ? 20 : linesPer); o++) {
      p.appendChild(document.createTextNode((headInjury ? 'DWIGHT' : randomLine().line) + ' '));
    }
    container.appendChild(p);
  }
});
