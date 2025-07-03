import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import OREChain from "@/plugins/OREChain";

import Antd from "ant-design-vue";
import "ant-design-vue/dist/antd.dark.css";

createApp(App).use(Antd).use(store).use(router).use(OREChain).mount("#app");
