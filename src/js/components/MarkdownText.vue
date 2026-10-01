<template>
  <div v-html="html"></div>
</template>

<script>
import MarkdownIt from 'markdown-it';

// raw HTML in the source stays disabled (markdown-it's default), so the output is safe
// to use with v-html
const md = new MarkdownIt({ linkify: true });

export default {
  props: {
    content: {
      type: String,
      default: '',
    },
  },

  computed: {
    html() {
      return md.render(this.content || '');
    },
  },
};
</script>
