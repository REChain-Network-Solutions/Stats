<script setup lang="ts">
import { computed, inject, ref, watch, onMounted, Ref, onUnmounted } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";
import { createChart } from "lightweight-charts";
import { DateTime } from "luxon";
import { getVolumeInUSDHelper } from "@/helpers/volumeInUSD.helper";
import OREChain from "@/oREChain";
import Pool from "@/helpers/PoolHelper";
import fetchCandlesForLast60Days from "@/api/fetchCandlesForLast60Days";
import fetchBalancesForLast60Days from "@/api/fetchBalancesForLast60Days";
import fetchAAHistory from "@/api/fetchAAHistory";
import { ICandles } from "@/interfaces/candles.inerface";
import { IHistory } from "@/interfaces/poolHistory.interface";
import Menu from "@/components/Menu.vue";
import useWindowSize from "@/composables/useWindowSize";
import { addZero } from "@/helpers/date.helper";

import { InfoCircleOutlined } from "@ant-design/icons-vue";
import Footer from "@/components/Footer.vue";

const Client = inject("OREChain") as OREChain.Client;
const store = useStore();
const route = useRoute();
const windowSize = useWindowSize();

interface IForChart {
  time: { day: number; month: number; year: number } | string;
  value: number;
}

interface ITypeMap {
  [key: string]: string;
}

store.dispatch("initIfNotInit", Client);
const exchangeRates = computed(() => store.state.exchangeRates);
const isReady = computed(() => store.state.ready);
const poolsData = computed(() => store.state.poolsData);
const tickers = computed(() => store.state.tickers);
const isMobile = computed(() => windowSize.x.value < 576);
const pool: Ref<Pool> = ref({} as Pool);
const candles: Ref<ICandles[]> = ref([]);
const chart = ref<HTMLElement>();
const blockWithChart = ref(null) as any;
const c = ref(null) as any;
const areaSeries = ref() as any;
const blockSize = ref(0);
const priceAndDate = ref<any>({ price: 0 });
const candlesForChart = ref([]) as Ref<IForChart[]>;
const balancesForChart = ref([]) as Ref<IForChart[]>;
const prices0ForChart = ref([]) as Ref<IForChart[]>;
const prices1ForChart = ref([]) as Ref<IForChart[]>;
const currentChart = ref(1);

let mousePosition = { x: 0, y: 0 };

function resize(): void {
  blockSize.value = blockWithChart.value.offsetWidth - 32;
  c.value.resize(blockSize.value, 250);
  c.value.timeScale().fitContent();
}

function setMousePosition(event: MouseEvent): void {
  mousePosition = { x: event.pageX, y: event.pageY };
}

function hashChanged() {
  switch (location.hash) {
    case "#volume":
      currentChart.value = 1;
      break;
    case "#tvl":
      currentChart.value = 2;
      break;
    case "#asset1":
      currentChart.value = 3;
      break;
    case "#asset2":
      currentChart.value = 4;
      break;
    default:
      currentChart.value = 1;
      break;
  }
  setChart();
}

async function updatePool() {
  if (!isReady.value) return;
  pool.value = poolsData.value.pools.find((p: Pool) => {
    return p.address === route.params.address;
  });

  pool.value.history = await fetchAAHistory(pool.value.address);

  const { assets } = poolsData.value;
  candles.value = await fetchCandlesForLast60Days(
    pool.value.address + "-" + pool.value.getTickerForAPI(assets)
  );
  candlesForChart.value = candles.value.map((v) => {
    return {
      time: v.start_timestamp.split("T")[0],
      value: Number(
        getVolumeInUSDHelper(
          pool.value.asset0,
          pool.value.asset1,
          v,
          exchangeRates
        ).toFixed(2)
      ),
    };
  });
  const balances = await fetchBalancesForLast60Days(pool.value.address);
  balancesForChart.value = balances.map((b) => {
    return {
      time: b.balance_date.split(" ")[0],
      value: Number(
        pool.value
          .getMarketcapByBalances(
            b,
            poolsData.value.assets,
            exchangeRates.value
          )
          .toFixed(2)
      ),
    };
  });
  balances.forEach((b) => {
    const balances = pool.value.getPricesByBalances(b, poolsData.value.assets);
    prices0ForChart.value.push({
      time: b.balance_date.split(" ")[0],
      value: balances[0],
    });
    prices1ForChart.value.push({
      time: b.balance_date.split(" ")[0],
      value: balances[1],
    });
  });
  window.addEventListener("resize", resize, false);
  window.addEventListener("mousemove", setMousePosition, false);
  window.addEventListener("hashchange", hashChanged, false);
  resize();
  hashChanged();
}

function timeToDate(time: any): string {
  return `${time.year}/${addZero(time.month)}/${addZero(time.day)}`;
}

function getPriceText(amount: number) {
  if (currentChart.value === 1 || currentChart.value === 2) {
    return "$" + formatPrice(Math.round(amount * 100) / 100);
  } else if (currentChart.value === 3) {
    return `${amount} ${pool.value.getTicker(
      pool.value.asset0,
      poolsData.value.assets
    )}/${pool.value.getSymbol(pool.value.asset1, poolsData.value.assets)}`;
  } else if (currentChart.value === 4) {
    return `${amount} ${pool.value.getSymbol(
      pool.value.asset1,
      poolsData.value.assets
    )}/${pool.value.getTicker(pool.value.asset0, poolsData.value.assets)}`;
  }
  return 0;
}

function formatPrice(n: number, isChart?: boolean) {
  if (isChart) {
    if (currentChart.value === 3) {
      return Number(n.toFixed(pool.value.asset1_decimals));
    } else if (currentChart.value === 4) {
      return Number(n.toFixed(pool.value.asset0_decimals));
    }
  }
  if (n < 1e3) return n.toFixed(2);
  if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(2) + "k";
  if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(2) + "M";
  if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(2) + "B";
  if (n >= 1e12) return +(n / 1e12).toFixed(2) + "T";
}

function fillChart() {
  if (!chart.value || !candles.value.length) return;

  if (!c.value) {
    c.value = createChart(chart.value, {
      width: blockSize.value,
      height: 250,
      localization: {
        dateFormat: "yyyy/MM/dd",
      },
      rightPriceScale: {
        visible: true,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        visible: true,
      },
      crosshair: {
        horzLine: {
          visible: false,
        },
        vertLine: {
          visible: false,
        },
      },
      layout: {
        backgroundColor: "#1c2024",
        textColor: "#d9d9d9",
      },
      grid: {
        vertLines: {
          visible: false,
        },
        horzLines: {
          visible: false,
        },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
      },
      handleScale: {
        axisPressedMouseMove: false,
        mouseWheel: false,
        pinch: false,
      },
    });

    const toolTip = document.getElementById("toolTip") as HTMLElement;
    const ttAmount = document.getElementById("ttAmount") as HTMLElement;
    const ttDate = document.getElementById("ttDate") as HTMLElement;
    c.value.subscribeCrosshairMove(function (param: any) {
      let chart = candlesForChart;
      switch (currentChart.value) {
        case 1:
          chart = candlesForChart;
          break;
        case 2:
          chart = balancesForChart;
          break;
        case 3:
          chart = prices0ForChart;
          break;
        case 4:
          chart = prices1ForChart;
          break;
      }
      if (
        !param.time ||
        param.point.x < 0 ||
        param.point.x > blockSize.value ||
        param.point.y < 0 ||
        param.point.y > 250
      ) {
        const time = chart.value[chart.value.length - 1].time;

        priceAndDate.value = {
          price: getPriceText(
            Number(chart.value[chart.value.length - 1].value)
          ),
          date: timeToDate(time),
        };
        toolTip.style.display = "none";
        return;
      }
      let price = param.seriesPrices.values().next().value;
      priceAndDate.value = {
        price: "",
        date: "",
      };
      ttAmount.innerHTML = getPriceText(price).toString();
      ttDate.innerHTML = timeToDate(param.time);
      toolTip.style.display = "block";
      toolTip.style.left = mousePosition.x + "px";
      toolTip.style.top = mousePosition.y - toolTip.clientHeight - 8 + "px";
    });
  }

  areaSeries.value = c.value.addAreaSeries({
    topColor: "rgba(23, 125, 220, 0.5)",
    lineColor: "rgba(23, 125, 220, 1)",
    bottomColor: "rgba(23, 125, 220, 0)",
    lineWidth: 2,
    priceFormat: {
      type: "custom",
      formatter: (price: number) => {
        return formatPrice(price, true);
      },
    },
    priceScale: {
      autoScale: true,
    },
  });
  areaSeries.value.createPriceLine({
    price: 0,
    color: "red",
    axisLabelVisible: false,
    lineStyle: 1,
  });

  areaSeries.value.setData(candlesForChart.value);
  const time = candlesForChart.value[candlesForChart.value.length - 1].time;
  priceAndDate.value = {
    price: getPriceText(candlesForChart.value[candles.value.length - 1].value),
    date: timeToDate(time),
  };
  resize();
}

function recreateChart(priceLineVisible: boolean): void {
  c.value.removeSeries(areaSeries.value);
  areaSeries.value = c.value.addAreaSeries({
    topColor: "rgba(23, 125, 220, 0.5)",
    lineColor: "rgba(23, 125, 220, 1)",
    bottomColor: "rgba(23, 125, 220, 0)",
    lineWidth: 2,
    priceLineVisible: priceLineVisible,
    priceFormat: {
      type: "custom",
      formatter: (price: number) => {
        return formatPrice(price, true);
      },
    },
    autoscaleInfoProvider: (original: () => any) => {
      const res = original();
      if (res !== null) {
        res.priceRange.minValue = 0;
      }
      return res;
    },
  });
  areaSeries.value.createPriceLine({
    price: 0,
    color: "rgba(22,125,218,0.7)",
    axisLabelVisible: false,
    lineStyle: 1,
  });
}

function setChart(): void {
  if (currentChart.value === 1) {
    recreateChart(false);
    areaSeries.value.setData(candlesForChart.value);
    priceAndDate.value = {
      price: getPriceText(
        candlesForChart.value[candles.value.length - 1].value
      ),
      date: timeToDate(candlesForChart.value[candles.value.length - 1].time),
    };
    if (location.hash !== "") {
      location.hash = "volume";
    }
  } else if (currentChart.value === 2) {
    recreateChart(false);
    areaSeries.value.setData(balancesForChart.value);
    priceAndDate.value = {
      price: getPriceText(
        balancesForChart.value[balancesForChart.value.length - 1].value
      ),
      date: timeToDate(
        balancesForChart.value[balancesForChart.value.length - 1].time
      ),
    };
    location.hash = "tvl";
  } else if (currentChart.value === 3) {
    recreateChart(true);
    areaSeries.value.setData(prices0ForChart.value);
    priceAndDate.value = {
      price: getPriceText(
        prices0ForChart.value[prices0ForChart.value.length - 1].value
      ),
      date: timeToDate(
        prices0ForChart.value[prices0ForChart.value.length - 1].time
      ),
    };
    location.hash = "asset1";
  } else if (currentChart.value === 4) {
    recreateChart(true);
    areaSeries.value.setData(prices1ForChart.value);
    priceAndDate.value = {
      price: getPriceText(
        prices1ForChart.value[prices1ForChart.value.length - 1].value
      ),
      date: timeToDate(
        prices1ForChart.value[prices1ForChart.value.length - 1].time
      ),
    };
    location.hash = "asset2";
  }

  c.value.timeScale().fitContent();
}

const columns = computed(() => {
  let ready = 1;
  let baseSymbol = "";
  let quoteSymbol = "";
  if (!pool.value.history?.length) {
    ready = 0;
  } else {
    baseSymbol = pool.value.getSymbol(
      pool.value.history[0].base_asset,
      poolsData.value.assets
    );
    quoteSymbol = pool.value.getSymbol(
      pool.value.history[0].quote_asset,
      poolsData.value.assets
    );
  }

  return [
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      slots: { customRender: "type" },
    },
    {
      title: ready ? `${baseSymbol} amount` : "Base Amount",
      dataIndex: "baseAmount",
      key: "baseAmount",
    },
    {
      title: ready ? `${quoteSymbol} amount` : "Quote Amount",
      dataIndex: "quoteAmount",
      key: "quoteAmount",
    },
    {
      title: "Author",
      dataIndex: "author",
      key: "author",
      slots: { customRender: "author" },
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
    },
  ];
});

const data = computed(() => {
  if (!pool.value.history?.length) return [];

  const baseSymbol = pool.value.getSymbol(
    pool.value.history[0].base_asset,
    poolsData.value.assets
  );
  const quoteSymbol = pool.value.getSymbol(
    pool.value.history[0].quote_asset,
    poolsData.value.assets
  );

  const typeMap: ITypeMap = {
    burn: "Burn",
    mint: "Mint",
    swap_in: `Swap ${quoteSymbol} to ${baseSymbol}`,
    swap_out: `Swap ${baseSymbol} to ${quoteSymbol}`,
  };
  return pool.value.history.map((item: IHistory) => {
    const type = typeMap[item.type];

    let asset0Amount = 0,
      asset1Amount = 0;
    if (item.type === "swap_out") {
      asset1Amount = item.base_qty;
      asset0Amount = item.quote_qty;
    } else {
      asset0Amount = item.base_qty;
      asset1Amount = item.quote_qty;
    }

    return {
      key: item.trigger_unit,
      type,
      unit: item.trigger_unit,
      author: item.trigger_address,
      base: baseSymbol,
      quote: quoteSymbol,
      baseAmount: pool.value.assetValue(
        asset0Amount,
        poolsData.value.assets[item.base_asset]
      ),
      quoteAmount: pool.value.assetValue(
        asset1Amount,
        poolsData.value.assets[item.quote_asset]
      ),
      date: DateTime.fromISO(item.timestamp).toFormat("yyyy/LL/dd HH:mm:ss"),
    };
  });
});

watch(poolsData, updatePool);
watch(
  () => route.params.address,
  () => {
    if (route.params.address) {
      updatePool();
    }
  }
);
watch([chart, candles], fillChart);
watch(currentChart, setChart);
onMounted(updatePool);
onUnmounted(() => {
  window.removeEventListener("resize", resize);
  window.removeEventListener("mousemove", setMousePosition);
  window.removeEventListener("hashchange", hashChanged);
});
</script>

<template>
  <Menu />
  <div id="toolTip">
    <div id="ttAmount"></div>
    <div id="ttDate"></div>
  </div>
  <div v-if="!isReady" style="text-align: center"><a-spin size="large" /></div>
  <div v-if="isReady && pool.ready">
    <div
      style="max-width: 1200px; width: 90%; margin: 16px auto; padding: 0 8px"
    >
      <div style="margin: 8px">
        <a-row>
          <a-col :xs="24" :sm="24" :md="12">
            <span style="font-size: 24px; color: #fff">{{ pool.ticker }}</span>
            <a-tag class="tag fee">{{ pool.swapFee / 1000000000 }}%</a-tag>
          </a-col>
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :style="{
              textAlign: isMobile ? 'left' : 'right',
              marginTop: isMobile ? '4px' : '0px',
            }"
          >
            <a
              :href="'https://REChainEXChange.io/#/add-liquidity/' + pool.address"
              target="_blank"
            >
              <a-button
                type="primary"
                size="large"
                style="border-radius: 8px; margin-top: 2px"
                >Add liquidity</a-button
              >
            </a>
            <a
              :href="'https://REChainEXChange.io/#/swap/' + pool.address"
              target="_blank"
            >
              <a-button
                type="primary"
                size="large"
                style="border-radius: 8px; margin-top: 2px; margin-left: 16px"
                >Trade</a-button
              >
            </a>
          </a-col>
        </a-row>
        <div v-if="pool.hasLiquidity()" style="margin-top: 16px">
          <div
            :style="
              isMobile ? { display: 'block' } : { display: 'inline-block' }
            "
          >
            <span class="tag">
              1 {{ pool.getTicker(pool.asset0, poolsData.assets) }} ≈
              {{
                pool.getFormattedPrice(
                  pool.asset0,
                  pool.asset1_decimals,
                  poolsData.assets
                )
              }}
              {{ pool.getSymbol(pool.asset1, poolsData.assets) }}
            </span>
          </div>
          <div
            :style="
              isMobile
                ? { display: 'block', marginTop: '16px' }
                : { display: 'inline-block', marginLeft: '8px' }
            "
          >
            <span class="tag">
              1 {{ pool.getTicker(pool.asset1, poolsData.assets) }} ≈
              {{
                pool.getFormattedPrice(
                  pool.asset1,
                  pool.asset0_decimals,
                  poolsData.assets
                )
              }}
              {{ pool.getSymbol(pool.asset0, poolsData.assets) }}
            </span>
          </div>
        </div>
      </div>
      <a-row style="color: #fff; margin-top: 24px">
        <a-col :xs="24" :sm="24" :md="6">
          <div class="block">
            <div class="titleInBlock">Volume 24H</div>
            <div class="contentInBlock">
              ${{
                formatPrice(
                  pool.get24hVolumeInUSD(
                    tickers,
                    poolsData.assets,
                    exchangeRates,
                    pool.address
                  )
                )
              }}
            </div>
          </div>
          <div class="block">
            <div class="titleInBlock">TVL</div>
            <div class="contentInBlock">
              ${{ formatPrice(Number(pool.marketcap.toFixed(2))) }}
            </div>
          </div>
          <div class="block">
            <div class="titleInBlock">
              APY
              <a-tooltip>
                <template #title>Based on the last 7 days</template>
                <InfoCircleOutlined />
              </a-tooltip>
            </div>
            <div class="contentInBlock">
              {{ pool.getAPY7d(candles, exchangeRates) }}%
            </div>
          </div>
        </a-col>
        <a-col :xs="24" :sm="24" :md="18">
          <div
            style="
              margin: 16px 8px;
              background-color: #1c2024;
              border-radius: 8px;
            "
          >
            <div style="padding: 16px">
              <a-row>
                <a-col :xs="24" :sm="24" :xl="16">
                  <a-radio-group
                    v-model:value="currentChart"
                    style="background-color: #24292e"
                  >
                    <a-radio-button :value="1">Volume</a-radio-button>
                    <a-radio-button :value="2">TVL</a-radio-button>
                    <a-radio-button :value="3"
                      >{{ pool.getTicker(pool.asset0, poolsData.assets) }}/{{
                        pool.getSymbol(pool.asset1, poolsData.assets)
                      }}</a-radio-button
                    >
                    <a-radio-button :value="4"
                      >{{ pool.getSymbol(pool.asset1, poolsData.assets) }}/{{
                        pool.getTicker(pool.asset0, poolsData.assets)
                      }}</a-radio-button
                    >
                  </a-radio-group>
                </a-col>
                <a-col
                  :xs="24"
                  :sm="24"
                  :xl="8"
                  style="text-align: right; height: 44px"
                >
                  <div style="font-weight: bold; font-size: 16px">
                    {{ priceAndDate.price }}
                  </div>
                  <div style="font-size: 12px; color: #acb7c3">
                    {{ priceAndDate.date }}
                  </div>
                </a-col>
              </a-row>
            </div>
            <div
              :ref="(el) => (blockWithChart = el)"
              style="padding: 0 16px 8px"
            >
              <div :ref="(el) => (chart = el)"></div>
            </div>
          </div>
        </a-col>
      </a-row>
      <a-table
        class="table"
        :dataSource="data"
        :columns="columns"
        :rowClassName="(record, index) => 'table-pointer'"
        :scroll="{ x: true }"
      >
        <template #type="{ record }">
          <span>
            <a
              target="_blank"
              :href="`https://explorer.oREChain.org/#${record.unit}`"
              >{{ record.type }}</a
            >
          </span>
        </template>
        <template #author="{ record }">
          <span>
            <a
              target="_blank"
              :href="`https://explorer.oREChain.org/#${record.author}`"
              >{{ record.author }}</a
            >
          </span>
        </template>
      </a-table>
      <Footer />
    </div>
  </div>
</template>

<style scoped>
.tag {
  color: #fff;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid #24292e;
  background-color: #24292e;
}
.tag.fee {
  margin-left: 12px;
  font-size: 16px;
  display: inline-block;
  margin-top: 3px;
  position: absolute;
}

.block {
  background-color: #1c2024;
  padding: 18px 12px;
  border-radius: 8px;
  margin: 16px 8px 20px;
}

.titleInBlock {
  font-weight: bold;
  font-size: 18px;
  color: #6a737d;
  margin-bottom: 6px;
  text-align: center;
}

.contentInBlock {
  align-items: center;
  display: flex;
  justify-content: center;
  font-size: 16px;
}

.table {
  padding: 0 8px;
}
@media screen and (max-width: 600px) {
  .fee {
    display: inline-block !important;
  }
}
</style>

<style>
.ant-radio-button-wrapper:first-child {
  border-radius: 8px 0 0 8px !important;
}

.ant-radio-button-wrapper:last-child {
  border-radius: 0 8px 8px 0 !important;
}

#toolTip {
  display: none;
  position: absolute;
  padding: 8px;
  color: #fff;
  z-index: 9999999;
  background-color: rgb(19, 21, 25);
  border-radius: 8px;
}

#ttAmount {
  font-size: 18px;
}

#ttDate {
  margin-top: 4px;
  font-size: 11px;
}
</style>
