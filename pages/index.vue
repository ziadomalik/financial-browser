<template>
  <div class="dashboard-container w-full h-full">
    <!-- Header section -->
    <div class="client-profile w-full h-[130px] bg-[#F6F6F6] rounded-[20px]">
      <div class="profile-info">
        <button class="menu-button">
          <span class="hamburger"></span>
        </button>
        <div class="avatar bg-white flex items-center justify-center">
            <Icon name="i-streamline-interface-setting-menu-2-button-parallel-horizontal-lines-menu-navigation-staggered-three-hamburger" class="size-6 text-[#292929] rounded-full" />
        </div>
        <div class="avatar bg-[#333] flex items-center justify-center">
            <Icon name="mdi:account" class="size-8 bg-[#D9D9D9] rounded-full" />
        </div>
        <div class="user-info">
          <h2 class="text-[#3E3E3E] font-semibold">John Smith</h2>
          <p class="text-[#626262] font-medium">Dashboard</p>
        </div>
      </div>
      <div class="avatar bg-white flex items-center justify-center">
        <Icon name="i-cuida-sliders-outline" class="size-6 text-[#292929] rounded-full" /> 
      </div>
    </div>

    <!-- Main dashboard grid -->
    <div class="dashboard-grid">
      <!-- Stock tickers row -->
      <div class="stock-tickers flex-col bg-[#F6F6F6] rounded-[20px] p-4">
          <div class="flex gap-4">
            <div class="ticker-card">
              <h3>MSFT</h3>
              <span class="percentage positive">+1.2%</span>
            </div>
            <div class="ticker-card">
              <h3>AAPL</h3>
              <span class="percentage positive">+2.1%</span>
            </div>
            <div class="ticker-card">
              <h3>AMZN</h3>
              <span class="percentage positive">+3.2%</span>
            </div>
            <div class="add-ticker">
                <Icon name="i-ph-plus-thin" class="size-12 text-[#F96E53]" />
            </div>
          </div>
          <!-- Compare performance section -->
          <div class="compare-section">
            <h3>Compare performance</h3>
            <p>Related</p>
          </div>
      </div>


      <!-- Stock performance card -->
      <div class="performance-card bg-[#F6F6F6] rounded-[20px] p-4 shadow-sm">
        <div class="bg-white rounded-[25px] p-3 mb-2">
            <div class="card-header flex justify-between items-center mb-2">
            <span class="chart-icon">
                <Icon name="i-ph-chart-line-up" class="size-5 text-gray-700" />
            </span>
            <span class="price text-[#000000] font-semibold text-base"><span class="text-[#DE3819]">$</span>117.52USD</span>
            </div>
            <div class="chart-area h-[80px] mb-2">
            <div class="relative h-full w-full">
                ...
            </div>
            </div>
        </div>
        <div class="card-footer flex justify-between items-center">
          <h3 class="text-base font-semibold text-gray-800">Stock performance</h3>
          <button class="view-button bg-[#F96E53] text-white py-1 px-3 rounded-full flex items-center gap-1 text-sm">
            View <Icon name="i-ph-arrow-right" class="size-4" />
          </button>
        </div>
      </div>

      <!-- Revenue Card -->
      <div class="revenue-card bg-[#F6F6F6] rounded-[20px] p-4 shadow-sm">
        <div class="bg-white rounded-[25px] p-3 mb-2">
            <div class="card-header flex justify-between items-center mb-2">
            <span class="chart-icon">
                <Icon name="i-ph-money" class="size-5 text-gray-700" />
            </span>
            <span class="price text-[#000000] font-semibold text-base"><span class="text-[#DE3819]">$</span>29.4B</span>
            </div>
            <div class="chart-area h-[80px] mb-2">
            <div class="relative h-full w-full">
                ...
            </div>
            </div>
        </div>
        <div class="card-footer flex justify-between items-center">
          <h3 class="text-base font-semibold text-gray-800">Revenue</h3>
          <button class="view-button bg-[#F96E53] text-white py-1 px-3 rounded-full flex items-center gap-1 text-sm">
            View <Icon name="i-ph-arrow-right" class="size-4" />
          </button>
        </div>
      </div>

      <!-- Forecast Card -->
      <div class="forecast-card bg-[#F6F6F6] rounded-[20px] p-4 shadow-sm">
        <div class="bg-white rounded-[25px] p-3 mb-2">
            <div class="card-header flex justify-between items-center mb-2">
            <span class="chart-icon">
                <Icon name="i-ph-chart-bar" class="size-5 text-gray-700" />
            </span>
            <span class="price text-[#000000] font-semibold text-base"><span class="text-[#DE3819]">$</span>142.75USD</span>
            </div>
            <div class="chart-area h-[80px] mb-2">
            <div class="relative h-full w-full">
                ...
            </div>
            </div>
        </div>
        <div class="card-footer flex justify-between items-center">
          <h3 class="text-base font-semibold text-gray-800">Price Forecast</h3>
          <button class="view-button bg-[#F96E53] text-white py-1 px-3 rounded-full flex items-center gap-1 text-sm">
            View <Icon name="i-ph-arrow-right" class="size-4" />
          </button>
        </div>
      </div>

      <!-- Voice assistant area -->
      <div class="voice-assistant">
        <SenseLogo v-model:isListening="isListening" />
        <p v-if="isListening" class="listening-text">Listening...</p>
      </div>

      <!-- Action buttons -->
      <div class="action-buttons">
        <button class="insights-button">
          More insights
          <Icon name="i-heroicons-plus" class="size-4 text-white" />
        </button>
        <button class="share-button flex items-center gap-2 text-[#F96E53] border border-[#F96E53] rounded-full py-2 px-6">
          <span class="text-[#F96E53]">Share insights</span>
          <Icon name="i-heroicons-share" class="size-4 text-[#F96E53]" />
        </button>
      </div>

      <!-- Query chips -->
      <div class="query-chips">
        <div class="chip volatile">" ...volatile..."</div>
        <div class="chip tech">" ...leading tech..."</div>
        <div class="chip nvidia">" Compare NVIDIA "</div>
        <div class="chip administration">" ...new administration "</div>
        <div class="chip crash">" market crash "</div>
        <div class="chip msft">" MSFT "</div>
        <div class="chip nasdaq">" NASDAQ "</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const isListening = ref(false);

// You might want to add a function to toggle listening state
const toggleListening = () => {
  isListening.value = !isListening.value;
};
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  border-radius: 20px;
  margin: 0 auto;
  font-family: 'Arial', sans-serif;
}

.client-profile {
  border-radius: 20px;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.profile-info {
  display: flex;
  gap: 15px;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-gap: 15px;
  position: relative;
}

.stock-tickers {
  grid-column: 1 / 10;
  grid-row: 1;
  display: flex;
  width: 100%;
  gap: 15px;
  margin-bottom: 20px;
}

.ticker-card {
  background-color: white;
  border-radius: 25px;
  padding: 15px;
  height: 130px;
  flex: 1;
}

.add-ticker {
  background-color: #F7DBD5;
  border-radius: 25px;
  display: flex;
  width: 94px;
  height: 94px;
  justify-content: center;
  align-items: center;
  border: 1px solid #F96E53;
  font-size: 24px;
  flex: 0.5;
}

.compare-section {
  grid-column: 3 / 10;
  grid-row: 2;
  border-radius: 15px;
  padding: 15px;
}

.compare-section h3 {
    font-size: 18px;
    font-weight: 600;
}

.compare-section p {
    font-size: 12px;
    font-weight: 400;
}

.performance-card {
  grid-column: 1 / 4;
  grid-row: 2;
  background-color: #F6F6F6;
  border-radius: 20px;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.revenue-card {
  grid-column: 4 / 7;
  grid-row: 2;
  background-color: #F6F6F6;
  border-radius: 20px;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.forecast-card {
  grid-column: 7 / 10;
  grid-row: 2;
  background-color: #F6F6F6;
  border-radius: 20px;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.circular-progress {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(#ff6b6b 46%, #e0e0e0 0);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
}

.circular-progress::after {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: white;
}

.percentage, .label {
  position: relative;
  z-index: 2;
}

.percentage {
  font-size: 24px;
  font-weight: bold;
}

.lock-card {
  grid-column: 10 / 12;
  grid-row: 3;
  background-color: white;
  border-radius: 15px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.carousel-nav {
  grid-column: 8 / 12;
  grid-row: 4;
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-buttons {
  grid-column: 2 / 10;
  grid-row: 5;
  display: flex;
  gap: 15px;
  justify-content: center;
}

.insights-button, .share-button {
  padding: 12px 20px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.insights-button {
  background-color: #ff6b6b;
  color: white;
}

.share-button {
  background-color: white;
  color: #333;
}

.query-chips {
  grid-column: 10 / 13;
  grid-row: 1 / 4;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chip {
  padding: 12px 15px;
  border-radius: 30px;
  text-align: center;
  font-size: 14px;
}

.volatile {
  background-color: #ff8f8f;
  color: white;
}

.tech {
  background-color: #f9edcf;
}

.nvidia {
  background-color: #e0cfff;
}

.administration {
  background-color: #c7f5d9;
}

.crash {
  background-color: #c7f5f5;
}

.msft {
  background-color: #ffa58f;
}

.nasdaq {
  background-color: #d0c7ff;
}

.voice-assistant {
  position: absolute;
  right: 0px;
  bottom: -100px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mic-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #ffede8;
  padding: 10px 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
}

.listening-text {
  color: #ff6b6b;
}

.percentage.positive {
  color: #ff6b6b;
  background-color: #ffedea;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 14px;
}

.view-button {
  background-color: #F96E53;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 20px;
}
</style>