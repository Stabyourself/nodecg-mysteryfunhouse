// tiny obs-websocket v5 client for browser sources (loopback only)

const DEFAULT_ADDRESS = '127.0.0.1:4455';
const RECONNECT_DELAY = 5000;

// for InputActiveStateChanged
export const OBS_INPUT_ACTIVE_EVENTS = 1 << 17;

const params = new URLSearchParams(window.location.search);

function stored(key, param) {
  const value = params.get(param);

  try {
    if (value != null) {
      localStorage.setItem(key, value);
      return value;
    }

    return localStorage.getItem(key);
  } catch (e) {
    return value;
  }
}

async function sha256base64(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

let socket = null;
let identified = false;
let everIdentified = false;
let reportedFailure = false;
let nextRequestId = 0;
const pending = new Map();
const eventHandlers = new Set();
const readyHandlers = new Set();

function address() {
  return stored('obsWsAddress', 'obsws') || DEFAULT_ADDRESS;
}

// player pages don't have ?obspw, they use the one a layout stored
function password() {
  return stored('obsWsPassword', 'obspw') || '';
}

// 4 = Scenes, 8 = Inputs, 128 = SceneItems, 256 = MediaInputs, 512 = Vendors
const SUBSCRIPTIONS = 4 | 8 | 128 | 256 | 512;

// high volume events have to be asked for, see obsConnect
let extraSubscriptions = 0;

async function identify(hello) {
  const message = { op: 1, d: { rpcVersion: 1, eventSubscriptions: SUBSCRIPTIONS | extraSubscriptions } };
  const auth = hello.d.authentication;

  if (auth) {
    const secret = await sha256base64(password() + auth.salt);
    message.d.authentication = await sha256base64(secret + auth.challenge);
  }

  socket.send(JSON.stringify(message));
}

function handleMessage(message) {
  if (message.op === 0) {
    identify(message);
    return;
  }

  if (message.op === 2) {
    identified = true;
    everIdentified = true;
    for (const handler of readyHandlers) handler();
    return;
  }

  if (message.op === 5) {
    for (const handler of eventHandlers) handler(message.d.eventType, message.d.eventData);
    return;
  }

  if (message.op === 7) {
    const request = pending.get(message.d.requestId);
    if (!request) return;
    pending.delete(message.d.requestId);

    if (message.d.requestStatus.result) {
      request.resolve(message.d.responseData);
    } else {
      request.reject(new Error(`${message.d.requestType}: ${message.d.requestStatus.comment}`));
    }
  }
}

// subscriptions: extra event bits, e.g. OBS_INPUT_ACTIVE_EVENTS
export function obsConnect(subscriptions = 0) {
  extraSubscriptions |= subscriptions;
  if (socket) return;

  socket = new WebSocket(`ws://${address()}`);

  socket.addEventListener('message', (e) => handleMessage(JSON.parse(e.data)));

  socket.addEventListener('close', (e) => {
    // obs closes the socket on a wrong password without saying why
    if (!everIdentified && !reportedFailure) {
      reportedFailure = true;
      console.error(
        `[obs] could not connect to obs-websocket at ${address()} (code ${e.code}).` +
          (password() ? '' : ' no password given - add ?obspw=<password> to this url')
      );
    }

    socket = null;
    identified = false;

    for (const request of pending.values()) request.reject(new Error('obs-websocket closed'));
    pending.clear();

    setTimeout(obsConnect, RECONNECT_DELAY);
  });

  socket.addEventListener('error', () => {
    if (socket) socket.close();
  });
}

export function obsRequest(requestType, requestData = {}) {
  if (!identified) return Promise.reject(new Error('obs-websocket not connected'));

  const requestId = String(nextRequestId++);

  return new Promise((resolve, reject) => {
    pending.set(requestId, { resolve, reject, requestType });
    socket.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
  });
}

export function onObsEvent(handler) {
  eventHandlers.add(handler);
  return () => eventHandlers.delete(handler);
}

export function onObsReady(handler) {
  readyHandlers.add(handler);
  if (identified) handler();
  return () => readyHandlers.delete(handler);
}

export function obsIdentified() {
  return identified;
}
