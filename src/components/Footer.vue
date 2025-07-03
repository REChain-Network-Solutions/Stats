<script setup lang="ts">
import { defineProps } from "vue";

defineProps({
  isHome: {
    type: Boolean,
    default: false,
    required: false,
  },
});
</script>

<template>
  <div class="footer" :class="isHome ? '' : 'notHome'">
    The displayed APY does not include the rewards from
    <a href="https://liquidity.oREChain.org" target="_blank">liquidity mining</a>.
  </div>
</template>

<style scoped>
.footer {
  color: #d3d3d3;
  padding: 16px 0 32px;
}

.notHome {
  padding-left: 8px;
  padding-right: 8px;
}
</style>
