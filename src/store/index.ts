import { createStore } from "vuex";
import fetchInitialData from "@/api/fetchInitialData";
import fetchPoolData from "@/api/fetchPoolData";
import fetchTickers from "@/api/fetchTickers";
import fetchExchangeRates from "@/api/fetchExchangeRates";

export default createStore({
  state: {
    initData: {},
    poolsData: [],
    tickers: {},
    exchangeRates: {},
    ready: false,
  },
  mutations: {
    setInitData(state, payload) {
      state.initData = payload;
    },
    setPoolsData(state, payload) {
      state.poolsData = payload;
    },
    setTickersData(state, payload) {
      state.tickers = payload;
    },
    setReady(state, status) {
      state.ready = status;
    },
    setExchangeRates(state, exchangeRates) {
      state.exchangeRates = exchangeRates;
    },
  },
  actions: {
    async initIfNotInit({ commit, state }, Client) {
      if (state.ready) return;

      const exchangeRates = await fetchExchangeRates();
      commit("setExchangeRates", exchangeRates);

      const initData = await fetchInitialData(Client);
      const { factory, a2sRegistry, descriptionRegistry, decimalsRegistry } =
        initData;

      const poolsData = await fetchPoolData(
        Client,
        factory,
        a2sRegistry,
        descriptionRegistry,
        decimalsRegistry,
        exchangeRates
      );

      const tickers = await fetchTickers();

      commit("setInitData", initData);
      commit("setPoolsData", poolsData);
      commit("setTickersData", tickers);
      commit("setReady", true);
    },
  },
  modules: {},
});
