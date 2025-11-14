// pool.js - Add Liquidity integration (final)
const ARLIQ = "0x3Be143cf70ACb16C7208673F1D3D2Ae403ebaEB3";
const USDC  = "0x3600000000000000000000000000000000000000";
const DEX   = "0xbA90A1Fa5D6Afa62789100678684F324Afc7F307";

let provider, signer;
let dexContract, arliqContract, usdcContract;

const abiERC20 = [
  "function balanceOf(address) view returns (uint)",
  "function approve(address spender, uint amount) returns (bool)",
  "function decimals() view returns (uint8)"
];
const abiDEX = [
  "function addLiquidity(uint amountA, uint amountB)"
];

const logBox = document.getElementById("logBox");
function log(msg){
  const t = new Date().toLocaleTimeString();
  logBox.innerHTML += `[${t}] ${msg}<br>`;
  logBox.scrollTop = logBox.scrollHeight;
}

document.getElementById("connectButton").onclick = async () => {
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    dexContract = new ethers.Contract(DEX, abiDEX, signer);
    arliqContract = new ethers.Contract(ARLIQ, abiERC20, signer);
    usdcContract = new ethers.Contract(USDC, abiERC20, signer);
    log("Wallet connected");
  } catch(e){ log("ERR connect: " + (e.message||e)); }
};

document.getElementById("addBtn").onclick = async () => {
  try {
    if(!signer) return log("Connect wallet first");
    const A = document.getElementById("liqARLIQ").value;
    const B = document.getElementById("liqUSDC").value;
    if(!A || !B) return log("Fill both amounts");

    const decA = await arliqContract.decimals().catch(()=>18);
    const decB = await usdcContract.decimals().catch(()=>6);

    const amtA = ethers.utils.parseUnits(A, decA);
    const amtB = ethers.utils.parseUnits(B, decB);

    const addr = await signer.getAddress();
    const balA = await arliqContract.balanceOf(addr);
    const balB = await usdcContract.balanceOf(addr);

    if(amtA.gt(balA)) return log("ERROR: ARLIQ exceeds balance");
    if(amtB.gt(balB)) return log("ERROR: USDC exceeds balance");

    log("Approving ARLIQ...");
    const tx1 = await arliqContract.approve(DEX, amtA);
    await tx1.wait();
    log("Approving USDC...");
    const tx2 = await usdcContract.approve(DEX, amtB);
    await tx2.wait();

    log("Adding liquidity...");
    const tx = await dexContract.addLiquidity(amtA, amtB);
    log("Tx: " + tx.hash);
    await tx.wait();
    log("Liquidity SUCCESS!");
    // refresh balances on success
    try { await (async ()=>{ const bA2 = await arliqContract.balanceOf(addr); const bB2 = await usdcContract.balanceOf(addr); document.getElementById("arliqBalance").innerText = ethers.utils.formatUnits(bA2, decA); document.getElementById("usdcBalance").innerText = ethers.utils.formatUnits(bB2, decB);} )(); } catch(e){}
  } catch(e){
    log("ERR addLiquidity: " + (e.message || e));
  }
};
