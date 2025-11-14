// app.js - ARCLIQ PRO (final)
// Addresses (change if needed)
const ARLIQ = "0x3Be143cf70ACb16C7208673F1D3D2Ae403ebaEB3";
const USDC  = "0x3600000000000000000000000000000000000000"; // native USDC (6)
const DEX   = "0xbA90A1Fa5D6Afa62789100678684F324Afc7F307"; // DEX V3 decimal-aware

// Ethers objects
let provider, signer;
let dexContract, arliqContract, usdcContract;

// ABIs (minimal)
const abiERC20 = [
  "function balanceOf(address) view returns (uint)",
  "function approve(address spender, uint amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];
const abiDEX = [
  "function addLiquidity(uint amountA, uint amountB)",
  "function swapARLIQtoUSDC(uint amountIn)",
  "function swapUSDCtoARLIQ(uint amountIn)"
];

// UI elements
const connectBtn = document.getElementById("connectButton");
const logBox = document.getElementById("logBox");
const swapBtn = document.getElementById("swapBtn");
const fromTokenBtn = document.getElementById("fromTokenBtn");
const toTokenBtn = document.getElementById("toTokenBtn");
const swapInputA = document.getElementById("swapAtoB");
const swapInputB = document.getElementById("swapBtoA");
const tokenListEl = document.getElementById("tokenList");
const modalBackdrop = document.getElementById("modalBackdrop");
const closeModal = document.getElementById("closeModal");
const tokenSearch = document.getElementById("tokenSearch");
const slipBtn = document.getElementById("slippageBtn");
const slipBackdrop = document.getElementById("slipBackdrop");
const slipOptions = document.querySelectorAll(".slip-option");
const slipValEl = document.getElementById("slipVal");
const priceImpactEl = document.getElementById("piVal");
const minReceiveEl = document.getElementById("minReceive");

// default token state
let tokenA = {address: ARLIQ, symbol: "ARLIQ", decimals: 18};
let tokenB = {address: USDC, symbol: "USDC", decimals: 6};
let selecting = null; // "from" or "to"
let slippage = localStorage.getItem("arcliq_slip") || "0.5"; // percent

slipValEl.innerText = slippage + "%";

// token list (extendable)
const TOKENS = [
  {address: ARLIQ, symbol: "ARLIQ", decimals: 18},
  {address: USDC, symbol: "USDC", decimals: 6}
];

// logging
function log(msg){
  const t = new Date().toLocaleTimeString();
  logBox.innerHTML += `[${t}] ${msg}<br>`;
  logBox.scrollTop = logBox.scrollHeight;
}

// connect wallet
connectBtn.onclick = async () => {
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    dexContract = new ethers.Contract(DEX, abiDEX, signer);
    arliqContract = new ethers.Contract(ARLIQ, abiERC20, signer);
    usdcContract = new ethers.Contract(USDC, abiERC20, signer);

    log("Wallet connected");
    await loadBalances();
    startAutoRefresh();
  } catch (e) {
    log("ERROR connect: " + (e.message || e));
  }
};

// load balances
async function loadBalances(){
  try {
    const addr = await signer.getAddress();
    const decA = await arliqContract.decimals().catch(()=>18);
    const decB = await usdcContract.decimals().catch(()=>6);

    const bA = await arliqContract.balanceOf(addr);
    const bB = await usdcContract.balanceOf(addr);

    document.getElementById("arliqBalance").innerText = ethers.utils.formatUnits(bA, decA);
    document.getElementById("usdcBalance").innerText = ethers.utils.formatUnits(bB, decB);
    log("Balances updated");
  } catch (e){
    log("ERROR load balance: " + (e.message || e));
  }
}

// auto refresh balances every 5s
let refreshInterval = null;
function startAutoRefresh(){
  if(refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(async ()=>{
    try { if(signer) await loadBalances(); } catch(e){}
  },5000);
}

// TOKEN SELECTOR
function openTokenSelector(which){
  selecting = which;
  modalBackdrop.classList.remove("hidden");
  renderTokenList(TOKENS);
  tokenSearch.value = "";
  tokenSearch.focus();
}
fromTokenBtn.onclick = ()=> openTokenSelector("from");
toTokenBtn.onclick = ()=> openTokenSelector("to");
closeModal.onclick = ()=> modalBackdrop.classList.add("hidden");
tokenSearch.oninput = (e)=>{
  const q = e.target.value.toLowerCase();
  const filtered = TOKENS.filter(t => t.symbol.toLowerCase().includes(q) || t.address.toLowerCase().includes(q));
  renderTokenList(filtered);
};

function renderTokenList(list){
  tokenListEl.innerHTML = "";
  list.forEach(t=>{
    const row = document.createElement("div");
    row.className = "token-row";
    row.innerHTML = `<div class="token-name"><div class="token-icon"></div><div>${t.symbol}</div></div><div style="font-size:13px;color:var(--muted)">${t.address.slice(0,6)}...</div>`;
    row.onclick = ()=>{
      if(selecting === "from"){ tokenA = t; fromTokenBtn.innerText = t.symbol + " ▾"; }
      else { tokenB = t; toTokenBtn.innerText = t.symbol + " ▾"; }
      modalBackdrop.classList.add("hidden");
      log(`Selected ${t.symbol} for ${selecting}`);
      if(signer) loadBalances();
    };
    tokenListEl.appendChild(row);
  });
}

// SLIPPAGE
slipBtn.onclick = ()=> slipBackdrop.classList.remove("hidden");
document.getElementById("closeSlip").onclick = ()=> slipBackdrop.classList.add("hidden");
slipOptions.forEach(b=>{
  b.onclick = ()=> {
    slippage = b.dataset.val;
    slipValEl.innerText = slippage + "%";
    localStorage.setItem("arcliq_slip", slippage);
    slipBackdrop.classList.add("hidden");
  };
});
document.getElementById("saveSlip").onclick = ()=>{
  const v = document.getElementById("slipCustom").value;
  if(v && !isNaN(v)){ slippage = v; slipValEl.innerText = slippage + "%"; localStorage.setItem("arcliq_slip", slippage); slipBackdrop.classList.add("hidden"); }
};

// simple estimate (placeholder)
function computeEstimate(amountStr){
  if(!amountStr || isNaN(Number(amountStr))) return {minReceive:"—", impact:"0%"};
  const amount = Number(amountStr);
  const impact = amount > 1000 ? "0.3%" : "0.01%";
  const minRecv = (amount * (1 - parseFloat(slippage)/100)).toFixed(6);
  return {minReceive: minRecv, impact};
}

// Swap ARLIQ -> USDC (uses DEX V3 function swapARLIQtoUSDC)
async function swapARLIQtoUSDC(){
  try {
    if(!signer) return log("Connect wallet first");
    const amount = document.getElementById("swapAtoB").value;
    if(!amount || isNaN(Number(amount))) return log("Invalid amount");
    const decA = await arliqContract.decimals();
    const amt = ethers.utils.parseUnits(amount, decA);

    const addr = await signer.getAddress();
    const bal = await arliqContract.balanceOf(addr);
    if(amt.gt(bal)) return log("ERROR: ARLIQ exceeds balance");

    log("Approving ARLIQ...");
    const apptx = await arliqContract.approve(DEX, amt);
    await apptx.wait();

    log("Swapping ARLIQ → USDC...");
    const tx = await dexContract.swapARLIQtoUSDC(amt);
    log("Tx sent: " + tx.hash);
    await tx.wait();
    log("Swap SUCCESS!");

    const est = computeEstimate(amount);
    minReceiveEl.innerText = "Minimum received: " + est.minReceive + " " + tokenB.symbol;
    priceImpactEl.innerText = est.impact;
    await loadBalances();
  } catch (e){
    log("ERROR swap: " + (e.message || e));
  }
}

// wire swap button
swapBtn.onclick = swapARLIQtoUSDC;

// init token list UI
renderTokenList(TOKENS);
slipValEl.innerText = slippage + "%";
