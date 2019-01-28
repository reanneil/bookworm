const writeEvent = (text) => {
  console.log(text)
  // <ul> element
  const parent = document.getElementById('#events');

  // <li> element
  const el = document.createElement('li');
  el.innerHTML = text;

  parent.appendChild(el);
};

const onFormSubmitted = (e) => {
  e.preventDefault();

  const input = document.querySelector('#chat');
  const text = input.value;
  input.value = '';

  socket.emit('message', text);
};

const addButtonListeners = () => {
  ['rock', 'paper', 'scissors'].forEach((id) => {
    const button = document.getElementById(id);
    button.addEventListener('click', () => {
      socket.emit('turn', id);
    });
  });
};

writeEvent('Welcome to RPS');

var socket = io();
socket.on('message', writeEvent);

document
  .querySelector('#chat-form')
  .addEventListener('submit', onFormSubmitted);

addButtonListeners();