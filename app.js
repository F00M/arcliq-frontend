const ARLIQ = "0x3Be143cf70ACb16C7208673F1D3D2Ae403ebaEB3";
const USDC  = "0x3600000000000000000000000000000000000000";
const DEX   = "0x76aD2ba9Fb6b6b17695b0D919881026Aa4Ba0748";

let provider;
let signer;
let dexContract;
let arliqContract;
let usdcContract;

const abiERC20 = [
    "function balanceOf(address) view returns (uint)",
    "function approve(address spender, uint amount) returns (bool)"
];

const abiDEX = [
    "function addLiquidity(uint amountARLIQ, uint amountUSDC)",
    "function swapARLIQtoUSDC(uint amountIn)",
    "function swapUSDCtoARLIQ(uint amountIn)"
];

document.getElementById("connectButton").onclick = async () => {
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    dexContract = new ethers.Contract(DEX, abiDEX, signer);
    arliqContract = new ethers.Contract(ARLIQ, abiERC20, signer);
    usdcContract = new ethers.Contract(USDC, abiERC20, signer);

    loadBalances();
};

async function loadBalances() {
    const address = await signer.getAddress();
    const b1 = await arliqContract.balanceOf(address);
    const b2 = await usdcContract.balanceOf(address);

    document.getElementById("arliqBalance").innerText = ethers.utils.formatUnits(b1, 18);
    document.getElementById("usdcBalance").innerText = ethers.utils.formatUnits(b2, 18);
}

async function addLiquidity() {
    const amountA = document.getElementById("liqARLIQ").value;
    const amountB = document.getElementById("liqUSDC").value;

    await arliqContract.approve(DEX, ethers.utils.parseUnits(amountA, 18));
    await usdcContract.approve(DEX, ethers.utils.parseUnits(amountB, 18));

    await dexContract.addLiquidity(
        ethers.utils.parseUnits(amountA, 18),
        ethers.utils.parseUnits(amountB, 18)
    );

    alert("Liquidity added!");
}

async function swapARLIQtoUSDC() {
    const amount = document.getElementById("swapAtoB").value;

    await arliqContract.approve(DEX, ethers.utils.parseUnits(amount, 18));
    await dexContract.swapARLIQtoUSDC(ethers.utils.parseUnits(amount, 18));

    alert("Swap complete!");
}

async function swapUSDCtoARLIQ() {
    const amount = document.getElementById("swapBtoA").value;

    await usdcContract.approve(DEX, ethers.utils.parseUnits(amount, 18));
    await dexContract.swapUSDCtoARLIQ(ethers.utils.parseUnits(amount, 18));

    alert("Swap complete!");
}
