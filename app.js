// ====== CONFIG ======
const ARLIQ = {
    address: "0x3Be143cf70ACb16C7208673F1D3D2Ae403ebaEB3",
    decimals: 18
};

const USDC = {
    address: "0x3600000000000000000000000000000000000000",
    decimals: 6
};

const DEX = "0x76aD2ba9Fb6b6b17695b0D919881026Aa4Ba0748";

let provider, signer, walletAddress;

// ====== INIT ======
async function initApp() {
    log("App initialized");
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
    }
}
initApp();

// ====== CONNECT WALLET ======
async function connectWallet() {
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    walletAddress = await signer.getAddress();
    document.getElementById("walletBtn").innerText = walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);
    log("Wallet connected");
    loadBalances();
}

// ====== LOAD BALANCES ======
async function loadBalances() {
    try {
        const arliqContract = new ethers.Contract(ARLIQ.address, ERC20ABI, provider);
        const usdcContract = new ethers.Contract(USDC.address, ERC20ABI, provider);

        let balA = await arliqContract.balanceOf(walletAddress);
        let balU = await usdcContract.balanceOf(walletAddress);

        document.getElementById("balA").innerText = (Number(balA) / 1e18).toFixed(4);
        document.getElementById("balU").innerText = (Number(balU) / 1e6).toFixed(4);
    } catch (err) {
        log("ERR load balance");
    }
}

// ====== GET ESTIMATED OUTPUT ======
async function updateOutput() {
    const amountIn = document.getElementById("fromInput").value;
    if (!amountIn || amountIn <= 0) {
        document.getElementById("minReceived").innerText = "—";
        return;
    }

    try {
        const dex = new ethers.Contract(DEX, DEXABI, provider);

        const out = await dex.getAmountOut(
            ethers.utils.parseUnits(amountIn, ARLIQ.decimals),
            ARLIQ.address,
            USDC.address
        );

        const formatted = Number(out / 1e6).toFixed(6);
        document.getElementById("minReceived").innerText = formatted + " USDC";
    } catch (err) {
        document.getElementById("minReceived").innerText = "—";
    }
}

// ====== SWAP ======
async function swapTokens() {
    const amount = document.getElementById("fromInput").value;

    try {
        const dex = new ethers.Contract(DEX, DEXABI, signer);
        const arliq = new ethers.Contract(ARLIQ.address, ERC20ABI, signer);

        // approve
        let tx1 = await arliq.approve(
            DEX,
            ethers.utils.parseUnits(amount, 18)
        );
        await tx1.wait();
        log("Approve OK");

        let tx2 = await dex.swapARLIQtoUSDC(
            ethers.utils.parseUnits(amount, 18)
        );
        await tx2.wait();

        log("Swap SUCCESS");
        loadBalances();
    } catch (err) {
        log("Swap ERROR");
    }
}

// ====== LOG HELPER ======
function log(t) {
    let box = document.getElementById("logBox");
    box.innerHTML += `[${new Date().toLocaleTimeString()}] ${t}<br>`;
}
