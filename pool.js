// pool.js — Add Liquidity integration for ARCLIQ DEX V3
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

    const decA = await arliqContract.decimals();
    const decB = await usdcContract.decimals();
    const amtA = ethers.utils.parseUnits(A, decA);
    const amtB = ethers.utils.parseUnits(B, decB);

    const addr = await signer.getAddress();
    const balA = await arliqContract.balanceOf(addr);
    const balB = await usdcContract.balanceOf(addr);

    if(amtA.gt(balA)) return log("ERROR: ARLIQ exceeds balance");
    if(amtB.gt(balB)) return log("ERROR: USDC exceeds balance");

    log("Approving ARLIQ...");
    await (await arliqContract.approve(DEX, amtA)).wait();
    log("Approving USDC...");
    await (await usdcContract.approve(DEX, amtB)).wait();

    log("Adding liquidity...");
    const tx = await dexContract.addLiquidity(amtA, amtB);
    log("Tx: " + tx.hash);
    await tx.wait();
    log("Liquidity SUCCESS!");
  } catch(e){
    log("ERR addLiquidity: " + (e.message||e));
  }
};
