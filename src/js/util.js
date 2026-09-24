var clone = require("clone");
var throttle = require("lodash/throttle");

// how long we wait for our own write to come back
const IN_FLIGHT_TIMEOUT = 5000;

// two-way binding between a vue property and a replicant
// writes go out right away. every value we send is remembered until it comes back, so
// an old echo ("t" arriving after we already sent "test") doesn't overwrite what you typed
// throttleWait only limits streams of changes (dragging), the last value always goes out
export function bindReplicant(vueName, replicantName = vueName, throttleWait = 100) {
  const replicant = nodecg.Replicant(replicantName, {
    defaultValue: this[vueName],
  });

  let lastSeen;
  let inFlight = new Map();

  const forget = (serialized) => {
    const timer = inFlight.get(serialized);
    if (timer) clearTimeout(timer);
    inFlight.delete(serialized);
  };

  const send = (newValue) => {
    const serialized = JSON.stringify(newValue);
    if (serialized === lastSeen) return;

    lastSeen = serialized;

    // never came back, stop waiting for it
    forget(serialized);
    inFlight.set(
      serialized,
      setTimeout(() => inFlight.delete(serialized), IN_FLIGHT_TIMEOUT)
    );

    replicant.value = clone(newValue);
  };

  const sendThrottled = throttleWait
    ? throttle(send, throttleWait, { leading: true, trailing: true })
    : send;

  const read = (newValue) => {
    const serialized = JSON.stringify(newValue);

    if (serialized === lastSeen) {
      forget(serialized);
      return;
    }

    // an old write of ours coming back, ignore
    if (inFlight.has(serialized)) {
      forget(serialized);
      return;
    }

    // change from somewhere else, but ours is newer and still on its way
    if (inFlight.size) return;

    lastSeen = serialized;
    this[vueName] = clone(newValue);
  };

  NodeCG.waitForReplicants(replicant).then(() => {
    read(replicant.value);

    replicant.on("change", read);

    this.$watch(vueName, sendThrottled);
  });
}

export function formatTimer(time, includeMs = true, alwaysIncludeHours = true) {
  let out = "";

  var ms = Math.floor(time % 1000),
    s = Math.floor((time / 1000) % 60),
    m = Math.floor((time / (1000 * 60)) % 60),
    h = Math.floor((time / (1000 * 60 * 60)) % 24);

  if (alwaysIncludeHours || h > 0) {
    out += ("0" + h).slice(-2);
    out += ":";
  }
  out += ("0" + m).slice(-2);
  out += ":";
  out += ("0" + s).slice(-2);

  if (includeMs) {
    out += ".";
    out += ("00" + ms).slice(-3);
  }

  return out;
}

export function apostrophe(s) {
  if (s.slice(-1) == "s") {
    return s + "’";
  } else {
    return s + "’s";
  }
}
