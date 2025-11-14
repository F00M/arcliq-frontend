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
    "function addLiquidity(uint amountA, uint amountB)",
    "function swapARLIQtoUSDC(uint amountIn)",
    "function swapUSDCtoARLIQ(uint amountIn)"
];

function log(msg) {
    const box = document.getElementById("logBox");
    const t = new Date().toLocaleTimeString();
    box.innerHTML += `[${t}] ${msg}<br>`;
    box.scrollTop = box.scrollHeight;
}

document.getElementById("connectButton").onclick = async () => {
    try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        dexContract   = new ethers.Contract(DEX, abiDEX, signer);
        arliqContract = new ethers.Contract(ARLIQ, abiERC20, signer);
        usdcContract  = new ethers.Contract(USDC, abiERC20, signer);

        log("Wallet connected");
    } catch (e) {
        log("ERROR connect: " + e.message);
    }
};

async function swapARLIQtoUSDC() {
    try {
        const amount = document.getElementById("swapAtoB").value;
        const decA   = await arliqContract.decimals();
        const amt    = ethers.utils.parseUnits(amount, decA);

        log("Approving ARLIQ...");
        await arliqContract.approve(DEX, amt);

        log("Swapping ARLIQ → USDC...");
        await dexContract.swapARLIQtoUSDC(amt);

        log("Swap SUCCESS!");

    } catch (e) {
        log("ERROR swap: " + e.message);
    }
}
