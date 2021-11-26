var clone = require("clone");

export function bindReplicant(
  vueName,
  replicantName = vueName,
  debounceWait = 300
) {
  const replicant = nodecg.Replicant(replicantName, {
    defaultValue: this[vueName],
  });
  let preventSend = false;

  let sendValue = _.debounce(function(newValue) {
    replicant.value = newValue;
  }, debounceWait);

  let readValue = (newValue) => {
    this[vueName] = clone(newValue);

    preventSend = true;
    this.$nextTick(() => {
      preventSend = false;
    });
  };

  NodeCG.waitForReplicants(replicant).then(() => {
    readValue(replicant.value);

    replicant.on("change", (newValue) => {
      readValue(newValue);
    });

    this.$watch(vueName, (newValue) => {
      if (!preventSend) {
        sendValue(newValue);
      }
    });
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
