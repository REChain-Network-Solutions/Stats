/* eslint-disable */

const oREChain = require("oREChain");

export default {
  // eslint-disable-next-line
  install: (app: any) => {
    const client = new oREChain.Client();
    client.onConnect(() => {
      const interval = setInterval(() => {
        client.api.heartbeat();
      }, 10 * 1000);

      client.client.ws.addEventListener("close", () => {
        if (interval) clearInterval(interval);
      });
    });

    app.config.globalProperties.$oREChain = client;
    app.provide("OREChain", client);
  },
};
