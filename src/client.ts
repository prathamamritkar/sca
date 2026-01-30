export const CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
export const CHAIN_ID = "0xaa36a7"; // Sepolia (11155111) in hex

if (!CLIENT_ID) {
    console.error("Missing VITE_THIRDWEB_CLIENT_ID in .env");
}

if (!CONTRACT_ADDRESS) {
    console.error("Missing VITE_CONTRACT_ADDRESS in .env");
}



