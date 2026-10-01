// Vuetify setup for the dashboard (the graphics don't use Vuetify). Only the components
// used in templates end up in the bundle, vite-plugin-vuetify imports them.
import 'vuetify/styles';
import { createVuetify } from 'vuetify';

const inputs = {
  variant: 'underlined',
  color: 'primary',
};

export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    // primary-darken-1..4, used by the popover timer bar
    variations: {
      colors: ['primary'],
      lighten: 0,
      darken: 4,
    },
    themes: {
      dark: {
        colors: {
          // nodecg's own accent colour
          primary: '#23C8C0',
        },
      },
    },
  },

  defaults: {
    VTextField: inputs,
    VTextarea: inputs,
    VSelect: inputs,
    VCombobox: inputs,
  },
});
