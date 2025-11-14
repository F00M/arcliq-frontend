/* ============================================
   app.js - ARCLIQ frontend (FINAL)
   Features:
   - fallback provider (simple)
   - connect wallet
   - balances
   - estimation getAmountOut via DEX view
   - approve + swap
   - add liquidity (pool.js compatible)
   - token selector + slippage
   - reverse tokens
   - log box
   ============================================ */

const RPC_FALLBACKS = [
  // primary will be MetaMask injected, but include JSON RPC fallback
  "https://rpc-testnet-v2.arc.market",
  "https://arctest-rpc.com",
  "https://testnet-rpc.arc.io"
];

let provider;    // ethers provider (Web3Provider from injected)
let fallbackProviders = [];
let signer;
let userAddr;

const TOKENS = {
  ARLIQ: { address: "0x3Be143cf70ACb16C7208673F1D3D2Ae403ebaEB3", symbol: "ARLIQ", decimals: 18 },
  USDC:  { address: "0x3600000000000000000000000000000000000000", symbol: "USDC", decimals: 6 }
};

const DEX = { address: "0xbA90A1Fa5D6Afa62789100678684F324Afc7F307", abi: [
  "function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) view returns (uint256)",
  "function swapARLIQtoUSDC(uint256 amountIn)",
  "function swapUSDCtoARLIQ(uint256 amountIn)",
  "function addLiquidity(uint256 amountA, uint256 amountB)"
]};

let dexContract;
let selectedFrom = "ARLIQ";
let selectedTo = "USDC";
let slippage = localStorage.getItem("arcliq_slip") || "0.5";

// UI refs
const connectButton = document.getElementById("connectWallet");
const fromAmountEl = document.getElementById("amountIn") || document.getElementById("from-amount") || document.getElementById("swapFrom");
const toAmountEl   = document.getElementById("amountOut") || document.getElementById("to-amount") || document.getElementById("swapTo");
const fromTokenBtn = document.getElementById("fromTokenBtn") || document.getElementById("fromToken") || document.getElementById("fromTokenBtn");
const toTokenBtn   = document.getElementById("toTokenBtn")   || document.getElementById("toToken") || document.getElementById("toTokenBtn");
const swapBtn      = document.getElementById("swapBtn") || document.getElementById("swapBtnMain") || document.getElementById("swapBtn");
const reverseBtn   = document.getElementById("reverseBtn");
const logBox       = document.getElementById("logBox");
const slipValEl    = document.getElementById("slipVal");
const tokenModal   = document.getElementById("tokenModal");
const tokenListEl  = document.getElementById("tokenList");
const tokenSearch  = document.getElementById("tokenSearch");
const closeTokenModal = document.getElementById("closeTokenModal");
const slipModal    = document.getElementById("slipModal");
const slipOptions  = document.querySelectorAll(".slip-option");
const closeSlip    = document.getElementById("closeSlip");
const saveSlipBtn  = document.getElementById("saveSlip");

// ensure some UI references exist in varied HTML
function log(msg){
  if(!logBox) return;
  const t = new Date().toLocaleTimeString();
  logBox.innerHTML += `[${t}] ${msg}<br>`;
  logBox.scrollTop = logBox.scrollHeight;
}

// Init fallback providers
for(const r of RPC_FALLBACKS){
  try{
    fallbackProviders.push(new ethers.providers.JsonRpcProvider(r));
  }catch(e){}
}

// Connect wallet
async function connectWallet(){
  try{
    if(!window.ethereum) throw new Error("No injected wallet");
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddr = await signer.getAddress();
    log("Wallet connected");
    // create dex with provider (use signer for write).
    dexContract = new ethers.Contract(DEX.address, DEX.abi, signer);
    // load balances and init listeners
    await loadBalances();
    startAutoRefresh();
  }catch(e){
    log("ERROR connect: " + (e.message || e));
  }
}

// load balances
async function loadBalances(){
  try{
    if(!userAddr) return;
    const providerToUse = provider || fallbackProviders[0];
    const arliq = new ethers.Contract(TOKENS.ARLIQ.address, ["function balanceOf(address) view returns (uint256)","function decimals() view returns (uint8)"], providerToUse);
    const usdc  = new ethers.Contract(TOKENS.USDC.address, ["function balanceOf(address) view returns (uint256)","function decimals() view returns (uint8)"], providerToUse);
    const b1 = await arliq.balanceOf(userAddr);
    const b2 = await usdc.balanceOf(userAddr);
    const balFromEl = document.getElementById("balanceFrom") || document.getElementById("balA") || document.getElementById("arliqBalance");
    const balToEl   = document.getElementById("balanceTo")   || document.getElementById("balB") || document.getElementById("usdcBalance");
    if(balFromEl) balFromEl.innerText = ethers.utils.formatUnits(b1, TOKENS.ARLIQ.decimals);
    if(balToEl)   balToEl.innerText   = ethers.utils.formatUnits(b2, TOKENS.USDC.decimals);
    log("Balances updated");
  }catch(e){
    log("ERROR load balance: " + (e.message || e));
  }
}

// auto refresh balances
let refreshInterval = null;
function startAutoRefresh(){
  if(refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(()=>{ if(signer) loadBalances(); },5000);
}

// token modal rendering
const TOK_LIST = [TOKENS.ARLIQ, TOKENS.USDC];
function openTokenModal(which){
  if(!tokenModal) return;
  tokenModal.classList.remove("hidden");
  renderTokenList(TOK_LIST);
  tokenSearch.value = "";
  selecting = which;
}
let selecting = null;
function renderTokenList(list){
  if(!tokenListEl) return;
  tokenListEl.innerHTML = "";
  list.forEach(t=>{
    const row = document.createElement("div");
    row.className = "token-row";
    row.innerHTML = `<div class="token-name"><div class="token-icon"></div><div>${t.symbol}</div></div><div style="font-size:13px;color:var(--muted)">${t.address.slice(0,6)}...</div>`;
    row.onclick = ()=>{
      if(selecting === "from"){
        selectedFrom = (t.symbol === "ARLIQ") ? "ARLIQ" : "USDC";
        if(document.getElementById("fromTokenBtn")) document.getElementById("fromTokenBtn").innerText = t.symbol + " ▾";
      } else {
        selectedTo = (t.symbol === "ARLIQ") ? "ARLIQ" : "USDC";
        if(document.getElementById("toTokenBtn")) document.getElementById("toTokenBtn").innerText = t.symbol + " ▾";
      }
      tokenModal.classList.add("hidden");
      updateEstimation();
      loadBalances().catch(()=>{});
    };
    tokenListEl.appendChild(row);
  });
}

// bind token modal
if(fromTokenBtn) fromTokenBtn.onclick = ()=> openTokenModal("from");
if(toTokenBtn)   toTokenBtn.onclick   = ()=> openTokenModal("to");
if(closeTokenModal) closeTokenModal.onclick = ()=> tokenModal.classList.add("hidden");
if(tokenSearch) tokenSearch.oninput = (e)=>{
  const q = e.target.value.toLowerCase();
  const filtered = TOK_LIST.filter(t => t.symbol.toLowerCase().includes(q) || t.address.toLowerCase().includes(q));
  renderTokenList(filtered);
};

// slippage modal
if(slipValEl) slipValEl.innerText = slippage + "%";
if(slipOptions) slipOptions.forEach(b=>{
  b.onclick = ()=> {
    slippage = b.dataset.val;
    localStorage.setItem("arcliq_slip", slippage);
    if(slipValEl) slipValEl.innerText = slippage + "%";
    if(slipModal) slipModal.classList.add("hidden");
  };
});
if(closeSlip) closeSlip.onclick = ()=> slipModal.classList.add("hidden");
if(saveSlipBtn) saveSlipBtn.onclick = ()=>{
  const v = document.getElementById("slipCustom")?.value;
  if(v && !isNaN(Number(v))) { slippage = v; localStorage.setItem("arcliq_slip", slippage); if(slipValEl) slipValEl.innerText = slippage + "%"; slipModal.classList.add("hidden"); }
};

// update estimation (use dex view)
async function updateEstimation(){
  try{
    const val = (fromAmountEl && fromAmountEl.value) ? fromAmountEl.value : "";
    if(!val || isNaN(Number(val)) || Number(val) <= 0) {
      if(toAmountEl) toAmountEl.value = "";
      return;
    }
    // parse amount using selectedFrom decimals
    const inDecimals = TOKENS[selectedFrom].decimals;
    const outDecimals = TOKENS[selectedTo].decimals;
    const raw = ethers.utils.parseUnits(val, inDecimals);

    // try calling getAmountOut on DEX using provider fallback if necessary
    let usedProvider = provider ? provider : (fallbackProviders.length? fallbackProviders[0] : null);
    if(!usedProvider && fallbackProviders.length) usedProvider = fallbackProviders[0];
    if(!usedProvider) { log("No provider for estimate"); return; }

    const readDex = new ethers.Contract(DEX.address, ["function getAmountOut(uint256,address,address) view returns (uint256)"], usedProvider);
    const out = await readDex.getAmountOut(raw, TOKENS[selectedFrom].address, TOKENS[selectedTo].address);

    if(toAmountEl) toAmountEl.value = ethers.utils.formatUnits(out, outDecimals);
    // price impact & min received calculation (rudimentary)
    const minReceivedEl = document.getElementById("minReceive") || document.getElementById("minReceive") ;
    const minRecv = (Number(ethers.utils.formatUnits(out, outDecimals)) * (1 - Number(slippage)/100)).toFixed(Math.max(3, outDecimals));
    if(minReceivedEl) minReceivedEl.innerText = "Minimum received: " + minRecv + " " + TOKENS[selectedTo].symbol;
  }catch(e){
    console.log("estimate error", e);
    if(toAmountEl) toAmountEl.value = "";
  }
}

// event: input update
if(fromAmountEl) {
  fromAmountEl.addEventListener("input", async ()=> {
    try { await updateEstimation(); } catch(e){ console.log(e); }
  });
}

// approve helper
async function approveIfNeeded(tokenAddr, amountRaw){
  try{
    const erc = new ethers.Contract(tokenAddr, ["function allowance(address,address) view returns (uint256)","function approve(address,uint256) returns (bool)"], signer);
    let allowance = await erc.allowance(userAddr, DEX.address);
    if(allowance.lt(amountRaw)){
      const tx = await erc.approve(DEX.address, amountRaw);
      log("Approving " + tokenAddr + " tx: " + tx.hash);
      await tx.wait();
      log("Approve confirmed");
    }
  }catch(e){ throw e; }
}

// do swap
async function doSwap(){
  try{
    if(!signer) return log("Connect wallet first");
    const val = (fromAmountEl && fromAmountEl.value) ? fromAmountEl.value : "";
    if(!val || Number(val) <= 0) return log("Invalid input");
    const inDecimals = TOKENS[selectedFrom].decimals;
    const raw = ethers.utils.parseUnits(val, inDecimals);
    // approve if needed
    await approveIfNeeded(TOKENS[selectedFrom].address, raw);
    // call the proper swap function
    if(selectedFrom === "ARLIQ" && selectedTo === "USDC"){
      const tx = await dexContract.swapARLIQtoUSDC(raw);
      log("Swap TX: " + tx.hash);
      await tx.wait();
      log("Swap success");
    } else if(selectedFrom === "USDC" && selectedTo === "ARLIQ"){
      const tx = await dexContract.swapUSDCtoARLIQ(raw);
      log("Swap TX: " + tx.hash);
      await tx.wait();
      log("Swap success");
    } else {
      log("Swap pair unsupported");
    }
    await loadBalances();
    await updateEstimation();
  }catch(e){
    log("ERROR swap: " + (e.message || e));
  }
}

// add liquidity - basic
async function addLiquidity(aStr, bStr){
  try{
    if(!signer) return log("Connect wallet");
    const aRaw = ethers.utils.parseUnits(aStr, TOKENS.ARLIQ.decimals);
    const bRaw = ethers.utils.parseUnits(bStr, TOKENS.USDC.decimals);
    await approveIfNeeded(TOKENS.ARLIQ.address, aRaw);
    await approveIfNeeded(TOKENS.USDC.address, bRaw);
    const tx = await dexContract.addLiquidity(aRaw, bRaw);
    log("AddLiquidity TX: " + tx.hash);
    await tx.wait();
    log("Liquidity SUCCESS!");
    await loadBalances();
  }catch(e){
    log("ERR addLiquidity: " + (e.message || e));
  }
}

// reverse tokens
function reverseTokens(){
  const tmp = selectedFrom;
  selectedFrom = selectedTo;
  selectedTo = tmp;
  // update UI buttons if present
  if(document.getElementById("fromTokenBtn")) document.getElementById("fromTokenBtn").innerText = TOKENS[selectedFrom].symbol + " ▾";
  if(document.getElementById("toTokenBtn")) document.getElementById("toTokenBtn").innerText = TOKENS[selectedTo].symbol + " ▾";
  updateEstimation();
  loadBalances().catch(()=>{});
}

// wire UI buttons
if(connectButton) connectButton.onclick = connectWallet;
if(swapBtn) swapBtn.onclick = doSwap;
if(reverseBtn) reverseBtn.onclick = reverseTokens;

// add basic keyboard enter => swap
if(fromAmountEl) fromAmountEl.addEventListener("keydown", (e)=>{
  if(e.key === "Enter"){
    if(swapBtn) swapBtn.click();
  }
});

// expose helper for pool page
window.addLiquidity = addLiquidity;

// initial log
log("App initialized");
