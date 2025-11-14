const ARLIQ = "0x3Be143cf70ACb16C7208673F1D3D2Ae403ebaEB3";
const USDC  = "0x3600000000000000000000000000000000000000";
const DEX   = "0xbA90A1Fa5D6Afa62789100678684F324Afc7F307";

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
    "function addLiquidity(uint amountA, uint amountB)"
];

function log(msg) {
    const box = document.getElementById("logBox");
    const t = new Date().toLocaleTimeString();
    box.innerHTML += `[${t}] ${msg}<br>`;
    box.scrollTop = box.scrollHeight;
}

document.getElementById("connectButton").onclick = async () => {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    dexContract   = new ethers.Contract(DEX, abiDEX, signer);
    arliqContract = new ethers.Contract(ARLIQ, abiERC20, signer);
    usdcContract  = new ethers.Contract(USDC, abiERC20, signer);

    log("Wallet connected");
};

async function addLiquidity() {
    try {
        const A = document.getElementById("liqARLIQ").value;
        const B = document.getElementById("liqUSDC").value;

        const decA = await arliqContract.decimals();
        const decB = await usdcContract.decimals();

        const amtA = ethers.utils.parseUnits(A, decA);
        const amtB = ethers.utils.parseUnits(B, decB);

        log("Approving ARLIQ...");
        await arliqContract.approve(DEX, amtA);

        log("Approving USDC...");
        await usdcContract.approve(DEX, amtB);

        log("Adding liquidity...");
        await dexContract.addLiquidity(amtA, amtB);

        log("SUCCESS!");

    } catch (e) {
        log("ERR: " + e.message);
    }
}
