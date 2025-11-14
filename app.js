// =========================
// ARCLIQ V3 FINAL SETTINGS
// =========================

const ARLIQ = "0x3Be143cf70ACb16C7208673F1D3D2Ae403ebaEB3"; // ARLIQ 18 decimals
const USDC  = "0x3600000000000000000000000000000000000000"; // USDC 6 decimals (ASLI)
const DEX   = "0xbA90A1Fa5D6Afa62789100678684F324Afc7F307"; // DEX V3 MAS FOOM (DECIMAL AWARE)

let provider;
let signer;
let dexContract;
let arliqContract;
let usdcContract;

const abiERC20 = [
    "function balanceOf(address) view returns (uint)",
    "function approve(address spender, uint amount) returns (bool)",
    "function decimals() view returns (uint8)"
];

const abiDEX = [
    "function addLiquidity(uint amountA, uint amountB)",
    "function swapARLIQtoUSDC(uint amountIn)",
    "function swapUSDCtoARLIQ(uint amountIn)"
];

// =========================
// LOG PANEL
// =========================
function log(msg) {
    const box = document.getElementById("logBox");
    const t = new Date().toLocaleTimeString();
    box.innerHTML += `[${t}] ${msg}<br>`;
    box.scrollTop = box.scrollHeight;
}

// =========================
// CONNECT WALLET
// =========================
document.getElementById("connectButton").onclick = async () => {
    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        dexContract  = new ethers.Contract(DEX, abiDEX, signer);
        arliqContract = new ethers.Contract(ARLIQ, abiERC20, signer);
        usdcContract  = new ethers.Contract(USDC, abiERC20, signer);

        log("Wallet connected");
        loadBalances();

    } catch (err) {
        log("ERROR connect wallet: " + err.message);
    }
};

// =========================
// LOAD BALANCES
// =========================
async function loadBalances() {
    try {
        const address = await signer.getAddress();

        const balA = await arliqContract.balanceOf(address);
        const balB = await usdcContract.balanceOf(address);

        const decA = await arliqContract.decimals();
        const decB = await usdcContract.decimals();

        document.getElementById("arliqBalance").innerText =
            ethers.utils.formatUnits(balA, decA);

        document.getElementById("usdcBalance").innerText =
            ethers.utils.formatUnits(balB, decB);

        log("Balances updated");

    } catch (err) {
        log("ERROR load balance: " + err.message);
    }
}

// =========================
// ADD LIQUIDITY
// (Semua decimals beres karena DEX V3 auto convert)
// =========================
async function addLiquidity() {
    try {
        const amountA = document.getElementById("liqARLIQ").value;
        const amountB = document.getElementById("liqUSDC").value;

        const decA = await arliqContract.decimals();
        const decB = await usdcContract.decimals();

        const neededA = ethers.utils.parseUnits(amountA, decA);
        const neededB = ethers.utils.parseUnits(amountB, decB);

        const address = await signer.getAddress();
        const balA = await arliqContract.balanceOf(address);
        const balB = await usdcContract.balanceOf(address);

        if (neededA.gt(balA)) return log("ERROR: ARLIQ exceeds balance");
        if (neededB.gt(balB)) return log("ERROR: USDC exceeds balance");

        log("Approving ARLIQ...");
        await arliqContract.approve(DEX, neededA);

        log("Approving USDC...");
        await usdcContract.approve(DEX, neededB);

        log("Adding liquidity...");
        await dexContract.addLiquidity(neededA, neededB);

        log("Liquidity SUCCESS!");

    } catch (err) {
        log("ERROR addLiquidity: " + err.message);
    }
}

// =========================
// SWAP ARLIQ → USDC
// =========================
async function swapARLIQtoUSDC() {
    try {
        const amount = document.getElementById("swapAtoB").value;

        const decA = await arliqContract.decimals();
        const needed = ethers.utils.parseUnits(amount, decA);

        const address = await signer.getAddress();
        const balA = await arliqContract.balanceOf(address);

        if (needed.gt(balA)) return log("ERROR: ARLIQ exceeds balance");

        log("Approving ARLIQ...");
        await arliqContract.approve(DEX, needed);

        log("Swapping ARLIQ → USDC...");
        await dexContract.swapARLIQtoUSDC(needed);

        log("Swap SUCCESS!");

    } catch (err) {
        log("ERROR swap A→B: " + err.message);
    }
}

// =========================
// SWAP USDC → ARLIQ
// =========================
async function swapUSDCtoARLIQ() {
    try {
        const amount = document.getElementById("swapBtoA").value;

        const decB = await usdcContract.decimals();
        const needed = ethers.utils.parseUnits(amount, decB);

        const address = await signer.getAddress();
        const balB = await usdcContract.balanceOf(address);

        if (needed.gt(balB)) return log("ERROR: USDC exceeds balance");

        log("Approving USDC...");
        await usdcContract.approve(DEX, needed);

        log("Swapping USDC → ARLIQ...");
        await dexContract.swapUSDCtoARLIQ(needed);

        log("Swap SUCCESS!");

    } catch (err) {
        log("ERROR swap B→A: " + err.message);
    }
}
