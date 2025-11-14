const ARLIQ = "0x3Be143cf70ACb16C7208673F1D3D2Ae403ebaEB3";
const WUSDC = "0xFC87e6e08e7d164C7097077C2C74450733FBCDC3"; // Wrapped USDC (18 decimals)
const DEX   = "0x76aD2ba9Fb6b6b17695b0D919881026Aa4Ba0748";

let provider;
let signer;
let dexContract;
let arliqContract;
let wusdcContract;

const abiERC20 = [
    "function balanceOf(address) view returns (uint)",
    "function approve(address spender, uint amount) returns (bool)"
];

const abiDEX = [
    "function addLiquidity(uint amountARLIQ, uint amountUSDC)",
    "function swapARLIQtoUSDC(uint amountIn)",
    "function swapUSDCtoARLIQ(uint amountIn)"
];

function log(msg) {
    const box = document.getElementById("logBox");
    const time = new Date().toLocaleTimeString();
    box.innerHTML += `[${time}] ${msg}<br>`;
    box.scrollTop = box.scrollHeight;
}

document.getElementById("connectButton").onclick = async () => {
    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        dexContract = new ethers.Contract(DEX, abiDEX, signer);
        arliqContract = new ethers.Contract(ARLIQ, abiERC20, signer);
        wusdcContract = new ethers.Contract(WUSDC, abiERC20, signer);

        log("Wallet connected");
        loadBalances();

    } catch (err) {
        log("ERROR connect wallet: " + err.message);
    }
};

async function loadBalances() {
    try {
        const address = await signer.getAddress();
        const b1 = await arliqContract.balanceOf(address);
        const b2 = await wusdcContract.balanceOf(address);

        document.getElementById("arliqBalance").innerText = ethers.utils.formatUnits(b1, 18);
        document.getElementById("usdcBalance").innerText  = ethers.utils.formatUnits(b2, 18);

        log("Balances updated");

    } catch (err) {
        log("ERROR load balance: " + err.message);
    }
}

async function addLiquidity() {
    try {
        const amountA = document.getElementById("liqARLIQ").value;
        const amountB = document.getElementById("liqUSDC").value;

        const address = await signer.getAddress();
        const balA = await arliqContract.balanceOf(address);
        const balB = await wusdcContract.balanceOf(address);

        const neededA = ethers.utils.parseUnits(amountA, 18);
        const neededB = ethers.utils.parseUnits(amountB, 18);

        if (neededA.gt(balA)) {
            log("ERROR: ARLIQ exceeds balance");
            return;
        }
        if (neededB.gt(balB)) {
            log("ERROR: WUSDC exceeds balance");
            return;
        }

        log("Approving ARLIQ...");
        await arliqContract.approve(DEX, neededA);

        log("Approving WUSDC...");
        await wusdcContract.approve(DEX, neededB);

        log("Adding liquidity...");
        await dexContract.addLiquidity(neededA, neededB);

        log("Liquidity SUCCESS!");

    } catch (err) {
        log("ERROR addLiquidity: " + err.message);
    }
}

async function swapARLIQtoUSDC() {
    try {
        const amount = document.getElementById("swapAtoB").value;

        const address = await signer.getAddress();
        const balA = await arliqContract.balanceOf(address);

        const needed = ethers.utils.parseUnits(amount, 18);

        if (needed.gt(balA)) {
            log("ERROR: ARLIQ exceeds balance");
            return;
        }

        log("Approving ARLIQ...");
        await arliqContract.approve(DEX, needed);

        log("Swapping ARLIQ → WUSDC...");
        await dexContract.swapARLIQtoUSDC(needed);

        log("Swap SUCCESS!");

    } catch (err) {
        log("ERROR swap A→B: " + err.message);
    }
}

async function swapUSDCtoARLIQ() {
    try {
        const amount = document.getElementById("swapBtoA").value;

        const address = await signer.getAddress();
        const balB = await wusdcContract.balanceOf(address);

        const needed = ethers.utils.parseUnits(amount, 18);

        if (needed.gt(balB)) {
            log("ERROR: WUSDC exceeds balance");
            return;
        }

        log("Approving WUSDC...");
        await wusdcContract.approve(DEX, needed);

        log("Swapping WUSDC → ARLIQ...");
        await dexContract.swapUSDCtoARLIQ(needed);

        log("Swap SUCCESS!");

    } catch (err) {
        log("ERROR swap B→A: " + err.message);
    }
}
