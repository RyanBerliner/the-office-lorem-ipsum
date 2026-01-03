export default function(el, children = []) {
  const [type, ...classes] = el.split('.');
  const node = document.createElement(type);
  if (classes.length) node.classList.add(...classes);
  children.forEach(child => {
    if (!child) return;
    if (typeof child === 'string') child = document.createTextNode(child);
    node.appendChild(child);
  });
  return node;
};
