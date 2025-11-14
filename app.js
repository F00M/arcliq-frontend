// ===============================================
// CONFIG
// ===============================================
const TOKENS = {
    ARLIQ: {
        symbol: "ARLIQ",
        decimals: 18,
        address: "0x3Be143cf70ACb16C7208673F1D3D2Ae403ebaEB3"
    },
    USDC: {
        symbol: "USDC",
        decimals: 6,
        address: "0x3600000000000000000000000000000000000000"
    }
};

let provider;
let signer;
let userAddress;
let dex;

const DEX_ADDRESS = "0xbA90A1Fa5D6Afa62789100678684F324Afc7F307";
const DEX_ABI = [
    "function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) view returns (uint256)",
    "function swap(address tokenIn, address tokenOut, uint256 amountIn) returns (uint256)",
    "function addLiquidity(uint256 amountA, uint256 amountB)"
];

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)"
];

let fromToken = "ARLIQ";
let toToken = "USDC";

// ===============================================
// CONNECT WALLET
// ===============================================
async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask dhisik, Mas!");

    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    document.querySelector(".connect-btn").innerText =
        userAddress.slice(0, 6) + "..." + userAddress.slice(-4);

    dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);

    loadBalances();
}

// ===============================================
// LOAD BALANCE
// ===============================================
async function loadBalances() {
    try {
        const arliq = new ethers.Contract(TOKENS.ARLIQ.address, ERC20_ABI, provider);
        const usdc = new ethers.Contract(TOKENS.USDC.address, ERC20_ABI, provider);

        const balA = await arliq.balanceOf(userAddress);
        const balU = await usdc.balanceOf(userAddress);

        document.getElementById("from-balance").innerText =
            Number(ethers.utils.formatUnits(balA, 18)).toLocaleString();

        document.getElementById("to-balance").innerText =
            Number(ethers.utils.formatUnits(balU, 6)).toLocaleString();
    } catch (e) {
        console.log("ERR load balance", e);
    }
}

// ===============================================
// UPDATE ESTIMATION
// ===============================================
document.getElementById("from-amount").addEventListener("input", async () => {
    await updateToAmount();
});

async function updateToAmount() {
    if (!dex) return;
    const val = document.getElementById("from-amount").value;
    if (!val || val <= 0) {
        document.getElementById("to-amount").value = "";
        return;
    }

    try {
        const raw = ethers.utils.parseUnits(val, TOKENS[fromToken].decimals);

        const out = await dex.getAmountOut(
            raw,
            TOKENS[fromToken].address,
            TOKENS[toToken].address
        );

        document.getElementById("to-amount").value =
            ethers.utils.formatUnits(out, TOKENS[toToken].decimals);
    } catch (e) {
        console.log("ERR calc:", e);
    }
}

// ===============================================
// SWAP
// ===============================================
async function doSwap() {
    if (!dex) return alert("Connect wallet disik Mas!");

    const amount = document.getElementById("from-amount").value;
    if (!amount) return;

    const raw = ethers.utils.parseUnits(amount, TOKENS[fromToken].decimals);
    const tokenContract = new ethers.Contract(
        TOKENS[fromToken].address,
        ERC20_ABI,
        signer
    );

    let allowance = await tokenContract.allowance(userAddress, DEX_ADDRESS);

    if (allowance.lt(raw)) {
        await tokenContract.approve(DEX_ADDRESS, raw);
    }

    const tx = await dex.swap(
        TOKENS[fromToken].address,
        TOKENS[toToken].address,
        raw
    );

    await tx.wait();
    loadBalances();
}

// ===============================================
// ADD LIQUIDITY
// ===============================================
async function addLiquidity() {
    if (!dex) return alert("Connect disik Mas!");

    const A = document.getElementById("from-amount").value;
    const B = document.getElementById("to-amount").value;

    if (!A || !B) return alert("Isi jumlah dhisik!");

    const rawA = ethers.utils.parseUnits(A, 18);
    const rawB = ethers.utils.parseUnits(B, 6);

    const tokenA = new ethers.Contract(TOKENS.ARLIQ.address, ERC20_ABI, signer);
    const tokenB = new ethers.Contract(TOKENS.USDC.address, ERC20_ABI, signer);

    if ((await tokenA.allowance(userAddress, DEX_ADDRESS)).lt(rawA))
        await tokenA.approve(DEX_ADDRESS, rawA);

    if ((await tokenB.allowance(userAddress, DEX_ADDRESS)).lt(rawB))
        await tokenB.approve(DEX_ADDRESS, rawB);

    const tx = await dex.addLiquidity(rawA, rawB);
    await tx.wait();

    loadBalances();
}
