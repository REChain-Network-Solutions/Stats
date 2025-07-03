<script setup lang="ts">
import { inject, computed, ComputedRef, ref, watch, onMounted } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import OREChain from "@/oREChain";
import Pool from "@/helpers/PoolHelper";
import { ITickers } from "@/interfaces/tickers.interface";
import Menu from "@/components/Menu.vue";
import Footer from "@/components/Footer.vue";
import useWindowSize from "@/composables/useWindowSize";
import fetchAPY7Days from "@/api/fetchAPY7Days";
import {
  TableState,
  TableStateFilters,
} from "ant-design-vue/es/table/interface";
import { InfoCircleOutlined } from "@ant-design/icons-vue";

type Pagination = TableState["pagination"];

const Client = inject("OREChain") as OREChain.Client;
const store = useStore();
const router = useRouter();
const windowSize = useWindowSize();
const apy7d = ref({}) as any;

store.dispatch("initIfNotInit", Client);

const exchangeRates = computed(() => store.state.exchangeRates);
const poolsData = computed(() => store.state.poolsData);
const tickers: ComputedRef<ITickers> = computed(() => store.state.tickers);
const isReady = computed(() => store.state.ready);
const isMobile = computed(() => windowSize.x.value < 576);

async function updateAPY7d() {
  apy7d.value = await fetchAPY7Days();
}
watch(poolsData, updateAPY7d);
onMounted(updateAPY7d);

const sortedInfo = ref({
  columnKey: "tvl",
});

if (localStorage.getItem("sort_key")) {
  sortedInfo.value = { columnKey: localStorage.getItem("sort_key") || "tvl" };
}

const customRow = (pool: { pool: { address: string } }) => {
  return {
    onClick: () => {
      router.push({
        name: "Pool",
        params: {
          address: pool.pool.address,
        },
      });
    },
  };
};

const formatNumbers = (n: number) => {
  if (n < 1e3) return n;
  if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(2) + "k";
  if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(2) + "M";
  if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(2) + "B";
  if (n >= 1e12) return +(n / 1e12).toFixed(2) + "T";
};

const columns = computed(() => {
  const key = sortedInfo.value.columnKey;
  return [
    {
      title: "Pool",
      dataIndex: "pool",
      key: "pool",
      slots: { customRender: "pool" },
    },
    {
      dataIndex: "TVLString",
      key: "tvl",
      sortDirections: ["descend"],
      sorter: (a: any, b: any) => a.TVLString - b.TVLString,
      sortOrder: key === "tvl" && "descend",
      slots: { title: "tvl-title", customRender: "TVL" },
    },
    {
      dataIndex: "APY",
      key: "APY",
      sortDirections: ["descend"],
      sorter: (a: any, b: any) => a.APY - b.APY,
      sortOrder: key === "APY" && "descend",
      slots: { title: "apy-title", customRender: "APY" },
    },
    {
      title: "Volume 24H",
      dataIndex: "volumeString",
      key: "volume",
      sortDirections: ["descend"],
      sorter: (a: any, b: any) => a.volume - b.volume,
      sortOrder: key === "volume" && "descend",
      slots: { customRender: "volume" },
    },
  ];
});

const mobileColumns = computed(() => {
  const key = sortedInfo.value.columnKey;
  return [
    {
      title: "Pool",
      dataIndex: "pool",
      key: "pool",
      slots: { customRender: "pool" },
    },
    {
      title: "TVL",
      dataIndex: "TVL",
      key: "tvl",
      sortDirections: ["descend"],
      sorter: (a: any, b: any) => a.TVLString - b.TVLString,
      sortOrder: key === "tvl" && "descend",
      slots: { customRender: "TVL" },
    },
    {
      title: "APY",
      dataIndex: "APY",
      key: "APY",
      sortDirections: ["descend"],
      sorter: (a: any, b: any) => a.APY - b.APY,
      sortOrder: key === "APY" && "descend",
      slots: { customRender: "APY" },
    },
  ];
});

const data = computed(() => {
  return poolsData.value.pools.map((pool: Pool) => {
    const TVL = Number(pool.marketcap.toFixed(2));
    const TVLString = formatNumbers(TVL);

    const volume = pool.get24hVolumeInUSD(
      tickers.value,
      poolsData.value.assets,
      exchangeRates.value,
      pool.address
    );
    const volumeString = formatNumbers(volume);

    return {
      key: pool.address,
      pool: {
        name: pool.ticker,
        fee: pool.swapFee / 1000000000,
        address: pool.address,
      },
      TVL,
      TVLString,
      APY: apy7d.value[pool.address] || 0,
      volume,
      volumeString,
    };
  });
});

const mobileData = computed(() => {
  return poolsData.value.pools.map((pool: Pool) => {
    return {
      key: pool.ticker,
      pool: {
        name: pool.ticker,
        fee: pool.swapFee / 1000000000,
        address: pool.address,
      },
      APY: apy7d.value[pool.address] || 0,
      TVL: Number(pool.marketcap.toFixed(2)),
    };
  });
});

const handleChange = (
  pagination: Pagination,
  filters: TableStateFilters,
  sorter: any
) => {
  sortedInfo.value = {
    columnKey: sorter.columnKey,
  };
  localStorage.setItem("sort_key", sorter.columnKey);
};
</script>

<template>
  <Menu :is-home="true" />
  <div
    style="
      color: #fff;
      text-align: center;
      font-size: 24px;
      margin: 36px auto 48px;
    "
  >
    Statistics for REChainEXChange.io
  </div>
  <div v-if="!isReady" style="text-align: center"><a-spin size="large" /></div>

  <div v-if="isReady">
    <div
      style="max-width: 1200px; width: 90%; margin: 16px auto; padding: 0 16px"
    >
      <a-table
        class="table"
        :dataSource="isMobile ? mobileData : data"
        :columns="isMobile ? mobileColumns : columns"
        :custom-row="customRow"
        :rowClassName="(record, index) => 'table-pointer'"
        @change="handleChange"
      >
        <template #tvl-title>
          <span>
            TVL
            <a-tooltip>
              <template #title>Total Value Locked</template>
              <InfoCircleOutlined />
            </a-tooltip>
          </span>
        </template>
        <template #apy-title>
          <span>
            APY
            <a-tooltip>
              <template #title>Based on the last 7 days</template>
              <InfoCircleOutlined />
            </a-tooltip>
          </span>
        </template>
        <template #pool="{ text: objPool }">
          {{ objPool.name }}
          <a-tag class="fee" style="margin-left: 8px">{{ objPool.fee }}%</a-tag>
        </template>
        <template #TVL="{ text }">${{ text }}</template>
        <template #APY="{ text }">{{ text }}%</template>
        <template #volume="{ text }">${{ text }}</template>
      </a-table>
      <Footer :isHome="true" />
    </div>
  </div>
</template>

<style>
.table {
  border-radius: 8px;
}
.ant-table-thead > tr > th {
  background-color: #26292f !important;
}
.table-pointer {
  cursor: pointer;
  background-color: #1b1e23;
}

.fee {
  display: inline-block;
}

@media screen and (max-width: 600px) {
  .fee {
    display: none !important;
  }
}
</style>
