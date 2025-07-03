<script setup lang="ts">
import { defineProps } from "vue";
import { useRouter } from "vue-router";

defineProps({
  isHome: {
    type: Boolean,
    default: false,
    required: false,
  },
});

const router = useRouter();

function goToHome(e: Event) {
  e.preventDefault();
  router.push({
    name: "Home",
  });
  return false;
}
</script>

<template>
  <div class="menu">
    <div style="display: flex">
      <a href="/" @click="goToHome">
        <img
          src="https://REChainEXChange.io/img/logo.4fab4f31.svg"
          width="36"
          alt="logo"
        />
      </a>
      <div class="menu-items">
        <a href="/" :class="isHome ? 'active' : ''" @click="goToHome">Pools</a>
        <a href="https://REChainEXChange.io" target="_blank">Swap</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto 24px;
  padding: 16px;
}
.menu-items {
  display: flex;
  font-size: 16px;
  color: #fff;
  align-items: center;
  margin-left: 24px;
}

.menu-items > a {
  height: 36px;
  color: #545e69;
  padding: 4px 20px;
  margin-left: 16px;
}

.menu-items > a.active,
.menu-items > a:hover {
  color: #fff;
  cursor: pointer;
  border-bottom: 2px solid #fff;
}
</style>
