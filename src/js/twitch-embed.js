// twitch's embed script, loaded the first time a player needs it. the layouts only show twitch
// players outside obs, so in obs they never wait on (or break with) player.twitch.tv

const EMBED_URL = 'https://player.twitch.tv/js/embed/v1.js';

let loading = null;

export function loadTwitchEmbed() {
  if (window.Twitch && window.Twitch.Embed) return Promise.resolve(window.Twitch);

  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = EMBED_URL;
      script.onload = () => resolve(window.Twitch);
      script.onerror = () => {
        // try again next time
        loading = null;
        script.remove();
        reject(new Error(`could not load ${EMBED_URL}`));
      };
      document.head.appendChild(script);
    });
  }

  return loading;
}
