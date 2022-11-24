<template>
  <MapView />
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import MapView from './components/map/MapView.vue';

@Options({
  components: {
    MapView
  },
})
export default class App extends Vue {}
</script>

<style>
#app {
    width: 100%;
    height: 100%;
    display: block;
}
</style>
