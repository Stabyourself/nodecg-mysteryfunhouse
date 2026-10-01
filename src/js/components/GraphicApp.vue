<template>
  <div id="app" class="v-application v-application--is-ltr theme--dark" data-app="true">
    <div class="v-application--wrap">
      <slot></slot>
    </div>
  </div>
</template>

<script>
// Root wrapper for the graphics. The layouts were built inside Vuetify 2's <v-app> and
// rely on what it gave them (the #app id, the flex column wrap, its CSS reset and
// defaults), so this renders the same markup, and src/scss/graphics-legacy.css carries
// the part of Vuetify 2's stylesheet the graphics use. Vuetify itself is dashboard-only.
export default {};
</script>
